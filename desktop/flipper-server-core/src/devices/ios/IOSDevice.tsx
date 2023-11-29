/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceDebugData, DeviceType, timeout} from 'flipper-common';
import {ChildProcess} from 'child_process';
import {IOSBridge} from './IOSBridge';
import {ServerDevice} from '../ServerDevice';
import {FlipperServerImpl} from '../../FlipperServerImpl';
import {iOSCrashWatcher} from './iOSCrashUtils';
import {iOSLogListener} from './iOSLogListener';
import {DebuggableDevice} from '../DebuggableDevice';
import tmp, {DirOptions} from 'tmp';
import {promisify} from 'util';
import path from 'path';
import {readFile} from 'fs/promises';

const tmpDir = promisify(tmp.dir) as (options?: DirOptions) => Promise<string>;

export default class IOSDevice
  extends ServerDevice
  implements DebuggableDevice
{
  private recording?: {process: ChildProcess; destination: string};
  private iOSBridge: IOSBridge;
  readonly logListener: iOSLogListener;
  readonly crashWatcher: iOSCrashWatcher;

  constructor(
    flipperServer: FlipperServerImpl,
    iOSBridge: IOSBridge,
    serial: string,
    deviceType: DeviceType,
    title: string,
  ) {
    super(flipperServer, {
      serial,
      deviceType,
      title,
      os: 'iOS',
      icon: 'mobile',
      features: {
        screenCaptureAvailable: true,
        screenshotAvailable: true,
      },
    });
    this.iOSBridge = iOSBridge;

    this.logListener = new iOSLogListener(
      () => this.connected,
      (logEntry) => this.addLogEntry(logEntry),
      this.iOSBridge,
      this.serial,
      this.info.deviceType,
    );
    // It is OK not to await the start of the log listener.
    // We just spawn it and handle errors internally.
    this.logListener
      .start()
      .catch((e) =>
        console.error('IOSDevice.logListener.start -> unexpected error', e),
      );
    this.crashWatcher = new iOSCrashWatcher(this);
    // It is OK not to await the start of the crash watcher.
    // We just spawn it and handle errors internally.
    this.crashWatcher
      .start()
      .catch((e) =>
        console.error('IOSDevice.crashWatcher.start -> unexpected error', e),
      );
  }

  async screenshot(): Promise<Buffer> {
    if (!this.connected) {
      return Buffer.from([]);
    }
    return await this.iOSBridge.screenshot(this.serial);
  }

  async navigateToLocation(location: string) {
    return this.iOSBridge.navigate(this.serial, location).catch((err) => {
      console.warn(`Failed to navigate to location ${location}:`, err);
      return err;
    });
  }

  async startScreenCapture(destination: string) {
    const recording = this.recording;
    if (recording) {
      throw new Error(
        `There is already an active recording at ${recording.destination}`,
      );
    }
    const process = this.iOSBridge.recordVideo(this.serial, destination);
    this.recording = {process, destination};
  }

  async stopScreenCapture(): Promise<string> {
    const recording = this.recording;
    if (!recording) {
      throw new Error('No recording in progress');
    }
    const prom = new Promise<void>((resolve, _reject) => {
      recording.process.on(
        'exit',
        async (_code: number | null, _signal: NodeJS.Signals | null) => {
          resolve();
        },
      );
      recording.process.kill('SIGINT');
    });

    const output: string = await timeout<void>(
      5000,
      prom,
      'Timed out to stop a screen capture.',
    )
      .then(() => {
        this.recording = undefined;
        return recording.destination;
      })
      .catch((e) => {
        this.recording = undefined;
        console.warn('Failed to terminate iOS screen recording:', e);
        throw e;
      });
    return output;
  }

  async installApp(ipaPath: string): Promise<void> {
    return this.iOSBridge.installApp(
      this.serial,
      ipaPath,
      this.flipperServer.config.paths.tempPath,
    );
  }

  async openApp(name: string): Promise<void> {
    return this.iOSBridge.openApp(this.serial, name);
  }

  async readFlipperFolderForAllApps(): Promise<DeviceDebugData[]> {
    console.debug('IOSDevice.readFlipperFolderForAllApps', this.info.serial);
    const installedApps = await this.iOSBridge.getInstalledApps(
      this.info.serial,
    );
    const userApps = installedApps.filter(
      ({installType}) =>
        installType === 'user' || installType === 'user_development',
    );
    console.debug(
      'IOSDevice.readFlipperFolderForAllApps -> found apps',
      this.info.serial,
      userApps,
    );

    const appsCommandsResults = await Promise.all(
      userApps.map(async (userApp): Promise<DeviceDebugData | undefined> => {
        let sonarDirFileNames: string[];
        try {
          sonarDirFileNames = await this.iOSBridge.ls(
            this.info.serial,
            userApp.bundleID,
            '/Library/Application Support/sonar',
          );
        } catch (e) {
          console.debug(
            'IOSDevice.readFlipperFolderForAllApps -> ignoring app as it does not have sonar dir',
            this.info.serial,
            userApp.bundleID,
          );
          return;
        }

        const dir = await tmpDir({unsafeCleanup: true});

        const sonarDirContent = await Promise.all(
          sonarDirFileNames.map(async (fileName) => {
            const filePath = `/Library/Application Support/sonar/${fileName}`;

            if (fileName.endsWith('pem')) {
              return {
                path: filePath,
                data: '===SECURE_CONTENT===',
              };
            }
            try {
              // See iOSCertificateProvider to learn why we need 2 pulls
              try {
                await this.iOSBridge.pull(
                  this.info.serial,
                  filePath,
                  userApp.bundleID,
                  dir,
                );
              } catch (e) {
                console.debug(
                  'IOSDevice.readFlipperFolderForAllApps -> Original idb pull failed. Most likely it is a physical device that requires us to handle the dest path dirrently. Forcing a re-try with the updated dest path. See D32106952 for details. Original error:',
                  this.info.serial,
                  userApp.bundleID,
                  fileName,
                  filePath,
                  e,
                );
                await this.iOSBridge.pull(
                  this.info.serial,
                  filePath,
                  userApp.bundleID,
                  path.join(dir, fileName),
                );
                console.debug(
                  'IOSDevice.readFlipperFolderForAllApps -> Subsequent idb pull succeeded. Nevermind previous warnings.',
                  this.info.serial,
                  userApp.bundleID,
                  fileName,
                  filePath,
                );
              }
              return {
                path: filePath,
                data: await readFile(path.join(dir, fileName), {
                  encoding: 'utf-8',
                }),
              };
            } catch (e) {
              return {
                path: filePath,
                data: `Couldn't pull the file: ${e}`,
              };
            }
          }),
        );

        return {
          serial: this.info.serial,
          appId: userApp.bundleID,
          data: [
            {
              command: 'iOSBridge.ls /Library/Application Support/sonar',
              result: sonarDirFileNames.join('\n'),
            },
            ...sonarDirContent,
          ],
        };
      }),
    );

    return (
      appsCommandsResults
        // Filter out apps without Flipper integration
        .filter((res): res is DeviceDebugData => !!res)
    );
  }

  disconnect() {
    if (this.recording) {
      this.stopScreenCapture();
    }
    super.disconnect();
  }
}
