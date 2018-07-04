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
import type Logger from '../fb-stubs/Logger.js';
const adb = require('adbkit-fb');

function createDecive(client, device): Promise<AndroidDevice> {
  return new Promise((resolve, reject) => {
    const type =
      device.type !== 'device' || device.id.startsWith('emulator')
        ? 'emulator'
        : 'physical';

    client.getProperties(device.id).then(async props => {
      let name = props['ro.product.model'];
      if (type === 'emulator') {
        name = (await getRunningEmulatorName(device.id)) || name;
      }
      const androidDevice = new AndroidDevice(device.id, type, name, client);
      androidDevice.reverse();
      resolve(androidDevice);
    });
  });
}

function getRunningEmulatorName(id: string): Promise<?string> {
  return new Promise((resolve, reject) => {
    const port = id.replace('emulator-', '');
    child_process.exec(
      `echo "avd name" | nc -w 1 localhost ${port}`,
      (error: ?Error, data: ?string) => {
        if (error == null && data != null) {
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
  const client = adb.createClient();

  // get emulators
  child_process.exec(
    '$ANDROID_HOME/tools/emulator -list-avds',
    (error: ?Error, data: ?string) => {
      if (error == null && data != null) {
        const payload = data.split('\n').filter(Boolean);
        store.dispatch({
          type: 'REGISTER_ANDROID_EMULATORS',
          payload,
        });
      }
    },
  );

  client
    .trackDevices()
    .then(tracker => {
      tracker.on('error', err => {
        if (err.message === 'Connection closed') {
          // adb server has shutdown, remove all android devices
          const {connections} = store.getState();
          const deviceIDsToRemove: Array<string> = connections.devices
            .filter((device: BaseDevice) => device instanceof AndroidDevice)
            .map((device: BaseDevice) => device.serial);

          store.dispatch({
            type: 'UNREGISTER_DEVICES',
            payload: new Set(deviceIDsToRemove),
          });
          console.error(
            'adb server shutdown. Run `adb start-server` and restart Sonar.',
          );
        } else {
          throw err;
        }
      });

      tracker.on('add', async device => {
        if (device.type !== 'offline') {
          const androidDevice = await createDecive(client, device);
          store.dispatch({
            type: 'REGISTER_DEVICE',
            payload: androidDevice,
          });
        }
      });

      tracker.on('change', async device => {
        if (device.type === 'offline') {
          store.dispatch({
            type: 'UNREGISTER_DEVICES',
            payload: new Set([device.id]),
          });
        } else {
          const androidDevice = await createDecive(client, device);
          store.dispatch({
            type: 'REGISTER_DEVICE',
            payload: androidDevice,
          });
        }
      });

      tracker.on('remove', device => {
        store.dispatch({
          type: 'UNREGISTER_DEVICES',
          payload: new Set([device.id]),
        });
      });
    })
    .catch(err => {
      if (err.code === 'ECONNREFUSED') {
        // adb server isn't running
      } else {
        throw err;
      }
    });
};
