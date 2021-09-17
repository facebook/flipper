/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import AndroidDevice from './AndroidDevice';
import KaiOSDevice from './KaiOSDevice';
import child_process from 'child_process';
import {getAdbClient} from './adbClient';
import which from 'which';
import {promisify} from 'util';
import {Client as ADBClient, Device} from 'adbkit';
import {join} from 'path';
import {FlipperServer} from '../../FlipperServer';
import {notNull} from '../../utils/typeUtils';

export class AndroidDeviceManager {
  // cache emulator path
  private emulatorPath: string | undefined;

  constructor(public flipperServer: FlipperServer) {}

  private createDevice(
    adbClient: ADBClient,
    device: Device,
  ): Promise<AndroidDevice | undefined> {
    return new Promise(async (resolve, reject) => {
      const type =
        device.type !== 'device' || device.id.startsWith('emulator')
          ? 'emulator'
          : 'physical';

      try {
        const props = await adbClient.getProperties(device.id);
        try {
          let name = props['ro.product.model'];
          const abiString = props['ro.product.cpu.abilist'] || '';
          const sdkVersion = props['ro.build.version.sdk'] || '';
          const abiList = abiString.length > 0 ? abiString.split(',') : [];
          if (type === 'emulator') {
            name = (await this.getRunningEmulatorName(device.id)) || name;
          }
          const isKaiOSDevice = Object.keys(props).some(
            (name) => name.startsWith('kaios') || name.startsWith('ro.kaios'),
          );
          const androidLikeDevice = new (
            isKaiOSDevice ? KaiOSDevice : AndroidDevice
          )(device.id, type, name, adbClient, abiList, sdkVersion);
          if (this.flipperServer.config.serverPorts) {
            await androidLikeDevice
              .reverse([
                this.flipperServer.config.serverPorts.secure,
                this.flipperServer.config.serverPorts.insecure,
              ])
              // We may not be able to establish a reverse connection, e.g. for old Android SDKs.
              // This is *generally* fine, because we hard-code the ports on the SDK side.
              .catch((e) => {
                console.warn(
                  `Failed to reverse-proxy ports on device ${androidLikeDevice.serial}: ${e}`,
                );
              });
          }
          if (type === 'physical') {
            // forward port for React DevTools, which is fixed on React Native
            await androidLikeDevice.reverse([8097]).catch((e) => {
              console.warn(
                `Failed to reverse-proxy React DevTools port 8097 on ${androidLikeDevice.serial}`,
                e,
              );
            });
          }
          resolve(androidLikeDevice);
        } catch (e) {
          reject(e);
        }
      } catch (e) {
        if (
          e &&
          e.message &&
          e.message === `Failure: 'device still connecting'`
        ) {
          console.debug('Device still connecting: ' + device.id);
        } else {
          const isAuthorizationError = (e?.message as string)?.includes(
            'device unauthorized',
          );
          if (!isAuthorizationError) {
            console.error('Failed to connect to android device', e);
          }
          this.flipperServer.emit('notification', {
            type: 'error',
            title: 'Could not connect to ' + device.id,
            description: isAuthorizationError
              ? 'Make sure to authorize debugging on the phone'
              : 'Failed to setup connection: ' + e,
          });
        }
        resolve(undefined); // not ready yet, we will find it in the next tick
      }
    });
  }

  async getEmulatorPath(): Promise<string> {
    if (this.emulatorPath) {
      return this.emulatorPath;
    }
    // TODO: this doesn't respect the currently configured android_home in settings!
    try {
      this.emulatorPath = (await promisify(which)('emulator')) as string;
    } catch (_e) {
      this.emulatorPath = join(
        process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '',
        'tools',
        'emulator',
      );
    }
    return this.emulatorPath;
  }

  async getAndroidEmulators(): Promise<string[]> {
    const emulatorPath = await this.getEmulatorPath();
    return new Promise<string[]>((resolve) => {
      child_process.execFile(
        emulatorPath as string,
        ['-list-avds'],
        (error: Error | null, data: string | null) => {
          if (error != null || data == null) {
            console.warn('List AVD failed: ', error);
            resolve([]);
            return;
          }
          const devices = data
            .split('\n')
            .filter(notNull)
            .filter((l) => l !== '');
          resolve(devices);
        },
      );
    });
  }

  private async getRunningEmulatorName(
    id: string,
  ): Promise<string | null | undefined> {
    return new Promise((resolve, reject) => {
      const port = id.replace('emulator-', '');
      // The GNU version of netcat doesn't terminate after 1s when
      // specifying `-w 1`, so we kill it after a timeout. Because
      // of that, even in case of an error, there may still be
      // relevant data for us to parse.
      child_process.exec(
        `echo "avd name" | nc -w 1 localhost ${port}`,
        {timeout: 1000, encoding: 'utf-8'},
        (error: Error | null | undefined, data) => {
          if (data != null && typeof data === 'string') {
            const match = data.trim().match(/(.*)\r\nOK$/);
            resolve(match != null && match.length > 0 ? match[1] : null);
          } else {
            reject(error);
          }
        },
      );
    });
  }

  async watchAndroidDevices() {
    try {
      const client = await getAdbClient(this.flipperServer.config);
      client
        .trackDevices()
        .then((tracker) => {
          tracker.on('error', (err) => {
            if (err.message === 'Connection closed') {
              console.warn('adb server was shutdown');
              this.flipperServer
                .getDevices()
                .filter((d) => d instanceof AndroidDevice)
                .forEach((d) => {
                  this.flipperServer.unregisterDevice(d.serial);
                });
              setTimeout(() => {
                this.watchAndroidDevices();
              }, 500);
            } else {
              throw err;
            }
          });

          tracker.on('add', async (device) => {
            if (device.type !== 'offline') {
              this.registerDevice(client, device);
            } else {
              console.warn(
                `[conn] Found device ${device.id}, but it has status offline. If this concerns an emulator and the problem persists, try these solutins: https://stackoverflow.com/a/21330228/1983583, https://stackoverflow.com/a/56053223/1983583`,
              );
            }
          });

          tracker.on('change', async (device) => {
            if (device.type === 'offline') {
              this.flipperServer.unregisterDevice(device.id);
            } else {
              this.registerDevice(client, device);
            }
          });

          tracker.on('remove', (device) => {
            this.flipperServer.unregisterDevice(device.id);
          });
        })
        .catch((err: {code: string}) => {
          if (err.code === 'ECONNREFUSED') {
            console.warn('adb server not running');
          } else {
            throw err;
          }
        });
    } catch (e) {
      console.warn(`Failed to watch for android devices: ${e.message}`);
    }
  }

  private async registerDevice(adbClient: ADBClient, deviceData: Device) {
    const androidDevice = await this.createDevice(adbClient, deviceData);
    if (!androidDevice) {
      return;
    }

    this.flipperServer.registerDevice(androidDevice);
  }
}
