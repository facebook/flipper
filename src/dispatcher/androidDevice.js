/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import AndroidDevice from '../devices/AndroidDevice';
import type {Store} from '../reducers/index.js';
import type BaseDevice from '../devices/BaseDevice';
const adb = require('adbkit-fb');

function createDecive(client, device): Promise<AndroidDevice> {
  return new Promise((resolve, reject) => {
    const type =
      device.type !== 'device' || device.id.startsWith('emulator')
        ? 'emulator'
        : 'physical';
    client.getProperties(device.id).then(props => {
      const androidDevice = new AndroidDevice(
        device.id,
        type,
        props['ro.product.model'],
        client,
      );
      androidDevice.reverse();
      resolve(androidDevice);
    });
  });
}

export default (store: Store) => {
  const client = adb.createClient();

  client
    .trackDevices()
    .then(tracker => {
      tracker.on('error', err => {
        if (err.message === 'Connection closed') {
          // adb server has shutdown, remove all android devices
          const {devices} = store.getState();
          const deviceIDsToRemove: Array<string> = devices
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
        const androidDevice = await createDecive(client, device);
        if (device.type !== 'offline') {
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
