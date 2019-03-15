/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import AndroidDevice from '../devices/AndroidDevice';
import child_process from 'child_process';
import type {Store} from '../reducers/index.js';
import type BaseDevice from '../devices/BaseDevice';
import type {Logger} from '../fb-interfaces/Logger.js';
import {registerDeviceCallbackOnPlugins} from '../utils/onRegisterDevice.js';
import {getAdbClient} from '../utils/adbClient';
import {default as which} from 'which';
import {promisify} from 'util';

function createDevice(
  adbClient: any,
  device: any,
  store: Store,
): Promise<AndroidDevice> {
  return new Promise((resolve, reject) => {
    const type =
      device.type !== 'device' || device.id.startsWith('emulator')
        ? 'emulator'
        : 'physical';

    adbClient.getProperties(device.id).then(async props => {
      let name = props['ro.product.model'];
      if (type === 'emulator') {
        name = (await getRunningEmulatorName(device.id)) || name;
      }
      const androidDevice = new AndroidDevice(device.id, type, name, adbClient);
      const ports = store.getState().application.serverPorts;
      androidDevice.reverse([ports.secure, ports.insecure]);
      resolve(androidDevice);
    });
  });
}

function getRunningEmulatorName(id: string): Promise<?string> {
  return new Promise((resolve, reject) => {
    const port = id.replace('emulator-', '');
    // The GNU version of netcat doesn't terminate after 1s when
    // specifying `-w 1`, so we kill it after a timeout. Because
    // of that, even in case of an error, there may still be
    // relevant data for us to parse.
    child_process.exec(
      `echo "avd name" | nc -w 1 localhost ${port}`,
      {timeout: 1000, encoding: 'utf-8'},
      (error: ?Error, data) => {
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

export default (store: Store, logger: Logger) => {
  const watchAndroidDevices = () => {
    // get emulators
    promisify(which)('emulator').then(emulatorPath => {
      child_process.exec(
        `${emulatorPath} -list-avds`,
        (error: ?Error, data: ?string) => {
          if (error != null || data == null) {
            console.error(error || 'Failed to list AVDs');
            return;
          }
          const payload = data.split('\n').filter(Boolean);
          store.dispatch({
            type: 'REGISTER_ANDROID_EMULATORS',
            payload,
          });
        },
      );
    });

    getAdbClient()
      .then(client => {
        client
          .trackDevices()
          .then(tracker => {
            tracker.on('error', err => {
              if (err.message === 'Connection closed') {
                // adb server has shutdown, remove all android devices
                const {connections} = store.getState();
                const deviceIDsToRemove: Array<string> = connections.devices
                  .filter(
                    (device: BaseDevice) => device instanceof AndroidDevice,
                  )
                  .map((device: BaseDevice) => device.serial);

                unregisterDevices(deviceIDsToRemove);
                console.error('adb server was shutdown');
                setTimeout(watchAndroidDevices, 500);
              } else {
                throw err;
              }
            });

            tracker.on('add', async device => {
              if (device.type !== 'offline') {
                registerDevice(client, device, store);
              }
            });

            tracker.on('change', async device => {
              if (device.type === 'offline') {
                unregisterDevices([device.id]);
              } else {
                registerDevice(client, device, store);
              }
            });

            tracker.on('remove', device => {
              unregisterDevices([device.id]);
            });
          })
          .catch(err => {
            if (err.code === 'ECONNREFUSED') {
              // adb server isn't running
            } else {
              throw err;
            }
          });
      })
      .catch(e => {
        console.error(`Failed to watch for android devices: ${e.message}`);
      });
  };

  async function registerDevice(adbClient: any, deviceData: any, store: Store) {
    const androidDevice = await createDevice(adbClient, deviceData, store);
    logger.track('usage', 'register-device', {
      os: 'Android',
      name: androidDevice.title,
      serial: androidDevice.serial,
    });
    store.dispatch({
      type: 'REGISTER_DEVICE',
      payload: androidDevice,
    });

    registerDeviceCallbackOnPlugins(
      store,
      store.getState().plugins.devicePlugins,
      store.getState().plugins.clientPlugins,
      androidDevice,
    );
  }

  async function unregisterDevices(deviceIds: Array<string>) {
    deviceIds.forEach(id =>
      logger.track('usage', 'unregister-device', {
        os: 'Android',
        serial: id,
      }),
    );
    store.dispatch({
      type: 'UNREGISTER_DEVICES',
      payload: new Set(deviceIds),
    });
  }

  watchAndroidDevices();
};
