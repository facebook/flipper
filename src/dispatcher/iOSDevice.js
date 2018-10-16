/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';

import {promisify} from 'util';
import child_process from 'child_process';
const execFile = promisify(child_process.execFile);
import IOSDevice from '../devices/IOSDevice';

type iOSSimulatorDevice = {|
  state: 'Booted' | 'Shutdown' | 'Shutting Down',
  availability?: string,
  isAvailable?: 'YES' | 'NO',
  name: string,
  udid: string,
|};

type IOSDeviceMap = {[id: string]: Array<iOSSimulatorDevice>};

function querySimulatorDevices(store: Store): Promise<IOSDeviceMap> {
  const {connections} = store.getState();

  return execFile('xcrun', ['simctl', 'list', 'devices', '--json'], {
    encoding: 'utf8',
  })
    .then(({stdout}) => JSON.parse(stdout).devices)
    .then((simulatorDevices: IOSDeviceMap) => {
      const simulators: Array<iOSSimulatorDevice> = Object.values(
        simulatorDevices,
        // $FlowFixMe
      ).reduce((acc, cv) => acc.concat(cv), []);

      const currentDeviceIDs: Set<string> = new Set(
        connections.devices
          .filter(device => device instanceof IOSDevice)
          .map(device => device.serial),
      );

      const deviceIDsToRemove = new Set();
      simulators.forEach((simulator: iOSSimulatorDevice) => {
        const isRunning =
          simulator.state === 'Booted' &&
          // For some users "availability" is set, for others it's "isAvailable"
          // It's not clear which key is set, so we are checking both.
          (simulator.availability === '(available)' ||
            simulator.isAvailable === 'YES');

        if (isRunning && !currentDeviceIDs.has(simulator.udid)) {
          // create device
          store.dispatch({
            type: 'REGISTER_DEVICE',
            payload: new IOSDevice(simulator.udid, 'emulator', simulator.name),
          });
        } else if (!isRunning && currentDeviceIDs.has(simulator.udid)) {
          deviceIDsToRemove.add(simulator.udid);
          // delete device
        }
      });

      if (deviceIDsToRemove.size > 0) {
        store.dispatch({
          type: 'UNREGISTER_DEVICES',
          payload: deviceIDsToRemove,
        });
      }
    });
}

export default (store: Store, logger: Logger) => {
  // monitoring iOS devices only available on MacOS.
  if (process.platform !== 'darwin') {
    return;
  }
  querySimulatorDevices(store)
    .then(() => {
      const simulatorUpdateInterval = setInterval(() => {
        querySimulatorDevices(store).catch(err => {
          console.error(err);
          clearInterval(simulatorUpdateInterval);
        });
      }, 3000);
    })
    .catch(console.error);
};
