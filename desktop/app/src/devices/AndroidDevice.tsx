/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from './BaseDevice';
import adb, {Client as ADBClient} from 'adbkit';
import {Priority, Reader} from 'adbkit-logcat';
import {createWriteStream} from 'fs';
import type {LogLevel, DeviceType} from 'flipper-plugin';
import which from 'which';
import {spawn} from 'child_process';
import {dirname} from 'path';
import {DeviceSpec} from 'flipper-plugin-lib';

const DEVICE_RECORDING_DIR = '/sdcard/flipper_recorder';

export default class AndroidDevice extends BaseDevice {
  adb: ADBClient;
  abiList: Array<string> = [];
  sdkVersion: string | undefined = undefined;
  pidAppMapping: {[key: number]: string} = {};
  private recordingProcess?: Promise<string>;
  reader?: Reader;

  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    adb: ADBClient,
    abiList: Array<string>,
    sdkVersion: string,
    specs: DeviceSpec[] = [],
  ) {
    super(serial, deviceType, title, 'Android', specs);
    this.adb = adb;
    this.icon = 'mobile';
    this.abiList = abiList;
    this.sdkVersion = sdkVersion;
  }

  startLogging() {
    this.adb
      .openLogcat(this.serial, {clear: true})
      .then((reader) => {
        this.reader = reader;
        reader
          .on('entry', (entry) => {
            let type: LogLevel = 'unknown';
            if (entry.priority === Priority.VERBOSE) {
              type = 'verbose';
            }
            if (entry.priority === Priority.DEBUG) {
              type = 'debug';
            }
            if (entry.priority === Priority.INFO) {
              type = 'info';
            }
            if (entry.priority === Priority.WARN) {
              type = 'warn';
            }
            if (entry.priority === Priority.ERROR) {
              type = 'error';
            }
            if (entry.priority === Priority.FATAL) {
              type = 'fatal';
            }

            this.addLogEntry({
              tag: entry.tag,
              pid: entry.pid,
              tid: entry.tid,
              message: entry.message,
              date: entry.date,
              type,
            });
          })
          .on('end', () => {
            if (this.reader) {
              // logs didn't stop gracefully
              setTimeout(() => {
                if (this.connected.get()) {
                  console.warn(
                    `Log stream broken: ${this.serial} - restarting`,
                  );
                  this.startLogging();
                }
              }, 100);
            }
          })
          .on('error', (e) => {
            console.warn('Failed to read from adb logcat: ', e);
          });
      })
      .catch((e) => {
        console.warn('Failed to open log stream: ', e);
      });
  }

  stopLogging() {
    this.reader?.end();
    this.reader = undefined;
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
    return this.executeShell(['logcat', '-c']);
  }

  navigateToLocation(location: string) {
    const shellCommand = `am start ${encodeURI(location)}`;
    this.adb.shell(this.serial, shellCommand);
  }

  async screenshot(): Promise<Buffer> {
    if (this.isArchived) {
      return Buffer.from([]);
    }
    return new Promise((resolve, reject) => {
      this.adb.screencap(this.serial).then((stream) => {
        const chunks: Array<Buffer> = [];
        stream
          .on('data', (chunk: Buffer) => chunks.push(chunk))
          .once('end', () => {
            resolve(Buffer.concat(chunks));
          })
          .once('error', reject);
      });
    });
  }

  async screenCaptureAvailable(): Promise<boolean> {
    if (this.isArchived) {
      return false;
    }
    try {
      await this.executeShell(
        `[ ! -f /system/bin/screenrecord ] && echo "File does not exist"`,
      );
      return true;
    } catch (_e) {
      return false;
    }
  }

  private async executeShell(command: string | string[]): Promise<void> {
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
    await this.executeShell(
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
          new Promise((resolve, reject) => {
            this.adb.pull(this.serial, recordingLocation).then((stream) => {
              stream.on('end', resolve as () => void);
              stream.on('error', reject);
              stream.pipe(createWriteStream(destination, {autoClose: true}), {
                end: true,
              });
            });
          }),
      )
      .then((_) => destination);

    return this.recordingProcess.then((_) => {});
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

  disconnect() {
    if (this.recordingProcess) {
      this.stopScreenCapture();
    }
    super.disconnect();
  }
}

export async function launchEmulator(name: string, coldBoot: boolean = false) {
  // On Linux, you must run the emulator from the directory it's in because
  // reasons ...
  return which('emulator')
    .then((emulatorPath) => {
      if (emulatorPath) {
        const child = spawn(
          emulatorPath,
          [`@${name}`, ...(coldBoot ? ['-no-snapshot-load'] : [])],
          {
            detached: true,
            cwd: dirname(emulatorPath),
          },
        );
        child.stderr.on('data', (data) => {
          console.warn(`Android emulator stderr: ${data}`);
        });
        child.on('error', (e) => console.warn('Android emulator error:', e));
      } else {
        throw new Error('Could not get emulator path');
      }
    })
    .catch((e) => console.error('Android emulator startup failed:', e));
}
