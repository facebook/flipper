/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import adb, {util, Client as ADBClient, PullTransfer} from 'adbkit';
import {Reader} from 'adbkit-logcat';
import {createWriteStream} from 'fs';
import type {DeviceDebugData, DeviceType} from 'flipper-common';
import {spawn} from 'child_process';
import {dirname, join} from 'path';
import {DeviceSpec} from 'flipper-common';
import {ServerDevice} from '../ServerDevice';
import {FlipperServerImpl} from '../../FlipperServerImpl';
import {AndroidCrashWatcher} from './AndroidCrashUtils';
import {AndroidLogListener} from './AndroidLogListener';
import {DebuggableDevice} from '../DebuggableDevice';
import {executeCommandAsApp, pull} from './androidContainerUtility';

const DEVICE_RECORDING_DIR = '/sdcard/flipper_recorder';

export default class AndroidDevice
  extends ServerDevice
  implements DebuggableDevice
{
  adb: ADBClient;
  pidAppMapping: {[key: number]: string} = {};
  private recordingProcess?: Promise<string>;
  reader?: Reader;
  readonly logListener: AndroidLogListener;
  readonly crashWatcher: AndroidCrashWatcher;

  constructor(
    flipperServer: FlipperServerImpl,
    serial: string,
    deviceType: DeviceType,
    title: string,
    adb: ADBClient,
    abiList: Array<string>,
    sdkVersion: string,
    specs: DeviceSpec[] = [],
  ) {
    super(flipperServer, {
      serial,
      deviceType,
      title,
      os: 'Android',
      icon: 'mobile',
      specs,
      abiList,
      sdkVersion,
      features: {
        screenCaptureAvailable: false,
        screenshotAvailable: false,
      },
    });
    this.adb = adb;

    this.logListener = new AndroidLogListener(
      () => this.connected,
      (logEntry) => this.addLogEntry(logEntry),
      this.adb,
      this.serial,
    );
    // It is OK not to await the start of the log listener. We just spawn it and handle errors internally.
    this.logListener
      .start()
      .catch((e) =>
        console.error('AndroidDevice.logListener.start -> unexpected error', e),
      );
    this.crashWatcher = new AndroidCrashWatcher(this);
    // It is OK not to await the start of the crash watcher. We just spawn it and handle errors internally.
    // Crash watcher depends on functioning log listener. It waits for its start internally.
    this.crashWatcher
      .start()
      .catch((e) =>
        console.error(
          'AndroidDevice.crashWatcher.start -> unexpected error',
          e,
        ),
      );
  }

  reverse(ports: number[]): Promise<void> {
    return Promise.all(
      ports.map((port) =>
        this.adb.reverse(this.serial, `tcp:${port}`, `tcp:${port}`),
      ),
    ).then(() => {
      return;
    });
  }

  clearLogs(): Promise<void> {
    return this.executeShellOrDie(['logcat', '-c']).catch((e) => {
      console.warn('Failed to clear logs:', e);
    });
  }

  async navigateToLocation(location: string) {
    const shellCommand = `am start ${encodeURI(location)}`;
    this.adb.shell(this.serial, shellCommand);
  }

  async screenshot(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.adb
        .screencap(this.serial)
        .then((stream) => {
          const chunks: Array<Buffer> = [];
          stream
            .on('data', (chunk: Buffer) => chunks.push(chunk))
            .once('end', () => {
              resolve(Buffer.concat(chunks));
            })
            .once('error', reject);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  async setIntoPermissiveMode(): Promise<void> {
    console.debug('AndroidDevice.setIntoPermissiveMode', this.serial);
    try {
      try {
        await this.adb.root(this.serial);
      } catch (e) {
        if (
          !(e instanceof Error) ||
          e.message !== 'adbd is already running as root'
        ) {
          throw e;
        }
      }
      console.debug(
        'AndroidDevice.setIntoPermissiveMode -> enabled root',
        this.serial,
      );
      await this.executeShellOrDie('setenforce 0');
      console.info(
        'AndroidDevice.setIntoPermissiveMode -> success',
        this.serial,
      );
    } catch (e) {
      console.info(
        'AndroidDevice.setIntoPermissiveMode -> failed',
        this.serial,
        e,
      );
    }
  }

  async screenRecordAvailable(): Promise<boolean> {
    try {
      await this.executeShellOrDie(
        `[ ! -f /system/bin/screenrecord ] && echo "File does not exist"`,
      );
      return true;
    } catch (_e) {
      return false;
    }
  }

  async executeShell(command: string): Promise<string> {
    return await this.adb
      .shell(this.serial, command)
      .then(adb.util.readAll)
      .then((output: Buffer) => output.toString().trim());
  }

  private async executeShellOrDie(command: string | string[]): Promise<void> {
    const output = await this.adb
      .shell(this.serial, command)
      .then(adb.util.readAll)
      .then((output: Buffer) => output.toString().trim());
    if (output) {
      throw new Error(output);
    }
  }

  private async getSdkVersion(): Promise<number> {
    return await this.adb
      .shell(this.serial, 'getprop ro.build.version.sdk')
      .then(adb.util.readAll)
      .then((output) => Number(output.toString().trim()));
  }

  private async isValidFile(filePath: string): Promise<boolean> {
    const sdkVersion = await this.getSdkVersion();
    const fileSize = await this.adb
      .shell(this.serial, `ls -l "${filePath}"`)
      .then(adb.util.readAll)
      .then((output: Buffer) => output.toString().trim().split(' '))
      .then((x) => x.filter(Boolean))
      .then((x) => (sdkVersion > 23 ? Number(x[4]) : Number(x[3])));

    return fileSize > 0;
  }

  async startScreenCapture(destination: string) {
    await this.executeShellOrDie(
      `mkdir -p "${DEVICE_RECORDING_DIR}" && echo -n > "${DEVICE_RECORDING_DIR}/.nomedia"`,
    );
    const recordingLocation = `${DEVICE_RECORDING_DIR}/video.mp4`;
    let newSize: string | undefined;
    try {
      const sizeString = (
        await adb.util.readAll(await this.adb.shell(this.serial, 'wm size'))
      ).toString();
      const size = sizeString.split(' ').slice(-1).pop()?.split('x');
      if (size && size.length === 2) {
        const width = parseInt(size[0], 10);
        const height = parseInt(size[1], 10);
        if (width > height) {
          newSize = '1280x720';
        } else {
          newSize = '720x1280';
        }
      }
    } catch (err) {
      console.error('Error while getting device size', err);
    }
    const sizeArg = newSize ? `--size ${newSize}` : '';
    const cmd = `screenrecord ${sizeArg} "${recordingLocation}"`;
    this.recordingProcess = this.adb
      .shell(this.serial, cmd)
      .then(adb.util.readAll)
      .then(async (output) => {
        const isValid = await this.isValidFile(recordingLocation);
        if (!isValid) {
          const outputMessage = output.toString().trim();
          throw new Error(
            'Recording was not properly started: \n' + outputMessage,
          );
        }
      })
      .then(
        (_) =>
          new Promise(async (resolve, reject) => {
            const stream: PullTransfer = await this.adb.pull(
              this.serial,
              recordingLocation,
            );
            stream.on('end', resolve as () => void);
            stream.on('error', reject);
            stream.pipe(createWriteStream(destination, {autoClose: true}), {
              end: true,
            });
          }),
      )
      .then((_) => destination);
    // Intentionally not return a promise, this just kicks off the recording!
  }

  async stopScreenCapture(): Promise<string> {
    const {recordingProcess} = this;
    if (!recordingProcess) {
      return Promise.reject(new Error('Recording was not properly started'));
    }
    await this.adb.shell(this.serial, `pkill -l2 screenrecord`);
    const destination = await recordingProcess;
    this.recordingProcess = undefined;
    return destination;
  }

  async forwardPort(local: string, remote: string): Promise<boolean> {
    return this.adb.forward(this.serial, local, remote);
  }

  disconnect() {
    if (this.recordingProcess) {
      this.stopScreenCapture();
    }
    super.disconnect();
  }

  async installApp(apkPath: string) {
    console.log(`Installing app with adb ${apkPath}`);
    await this.adb.install(this.serial, apkPath);
  }

  async readFlipperFolderForAllApps(): Promise<DeviceDebugData[]> {
    console.debug(
      'AndroidDevice.readFlipperFolderForAllApps',
      this.info.serial,
    );
    const output = await this.adb
      .shell(this.info.serial, 'pm list packages -3 -e')
      .then(util.readAll)
      .then((buffer) => buffer.toString());

    const appIds = output
      .split('\n')
      // Each appId has \n at the end. The last appId also has it.
      // As a result, there is an "" (empty string) item at the end after the split.
      .filter((appId) => appId !== '')
      // Cut off the "package:" prefix
      .map((appIdRaw) => appIdRaw.substring('package:'.length));
    console.debug(
      'AndroidDevice.readFlipperFolderForAllApps -> found apps',
      this.info.serial,
      appIds,
    );

    const appsCommandsResults = await Promise.all(
      appIds.map(async (appId): Promise<DeviceDebugData | undefined> => {
        const sonarDirFilePaths = await executeCommandAsApp(
          this.adb,
          this.info.serial,
          appId,
          `find /data/data/${appId}/files/sonar -type f`,
        )
          .then((output) => {
            if (output.includes('No such file or directory')) {
              console.debug(
                'AndroidDevice.readFlipperFolderForAllApps -> skipping app because sonar dir does not exist',
                this.info.serial,
                appId,
              );
              return;
            }

            return (
              output
                .split('\n')
                // Each entry has \n at the end. The last one also has it.
                // As a result, there is an "" (empty string) item at the end after the split.
                .filter((appId) => appId !== '')
            );
          })
          .catch((e) => {
            console.debug(
              'AndroidDevice.readFlipperFolderForAllApps -> failed to fetch sonar dir',
              this.info.serial,
              appId,
              e,
            );
          });

        if (!sonarDirFilePaths) {
          return;
        }

        const sonarDirContentPromises = sonarDirFilePaths.map(
          async (filePath) => {
            if (filePath.endsWith('pem')) {
              return {
                path: filePath,
                data: '===SECURE_CONTENT===',
              };
            }
            return {
              path: filePath,
              data: await pull(
                this.adb,
                this.info.serial,
                appId,
                filePath,
              ).catch((e) => `Couldn't pull the file: ${e}`),
            };
          },
        );

        const sonarDirContentWithStatsCommandPromise = executeCommandAsApp(
          this.adb,
          this.info.serial,
          appId,
          `ls -al /data/data/${appId}/files/sonar`,
        ).then((output): DeviceDebugData['data'][0] => ({
          command: `ls -al /data/data/${appId}/files/sonar`,
          result: output,
        }));

        const singleAppCommandResults = await Promise.all([
          sonarDirContentWithStatsCommandPromise,
          ...sonarDirContentPromises,
        ]);

        return {
          serial: this.info.serial,
          appId,
          data: singleAppCommandResults,
        };
      }),
    );

    return (
      appsCommandsResults
        // Filter out apps without Flipper integration
        .filter((res): res is DeviceDebugData => !!res)
    );
  }
}

export async function launchEmulator(
  androidHome: string,
  name: string,
  coldBoot: boolean = false,
) {
  try {
    // On Linux, you must run the emulator from the directory it's in because
    // reasons ...
    const emulatorPath = join(androidHome, 'emulator', 'emulator');
    const child = spawn(
      emulatorPath,
      [`@${name}`, ...(coldBoot ? ['-no-snapshot-load'] : [])],
      {
        detached: true,
        cwd: dirname(emulatorPath),
        env: {
          ...process.env,
          ANDROID_SDK_ROOT: androidHome,
        },
      },
    );
    child.stderr.on('data', (data) => {
      console.warn(`Android emulator stderr: ${data}`);
    });
    child.on('error', (e) => console.warn('Android emulator error:', e));
  } catch (e) {
    console.warn('Android emulator startup failed:', e);
  }
}
