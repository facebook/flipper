/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ChildProcess} from 'child_process';
import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';

import child_process from 'child_process';
import IOSDevice from '../devices/IOSDevice';

type iOSSimulatorDevice = {|
  state: 'Booted' | 'Shutdown' | 'Shutting Down',
  availability: string,
  name: string,
  udid: string,
|};

type IOSDeviceMap = {[id: string]: Array<iOSSimulatorDevice>};

// start port forwarding server for real device connections
const portForwarder: ChildProcess = child_process.exec(
  'PortForwardingMacApp.app/Contents/MacOS/PortForwardingMacApp -portForward=8088 -multiplexChannelPort=8078',
);
window.addEventListener('beforeunload', () => {
  portForwarder.kill();
});

function querySimulatorDevices(): Promise<IOSDeviceMap> {
  return new Promise((resolve, reject) => {
    child_process.execFile(
      'xcrun',
      ['simctl', 'list', 'devices', '--json'],
      {encoding: 'utf8'},
      (err, stdout) => {
        if (err) {
          reject(err);
        }

        try {
          const {devices} = JSON.parse(stdout.toString());
          resolve(devices);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

export default (store: Store, logger: Logger) => {
  // monitoring iOS devices only available on MacOS.
  if (process.platform !== 'darwin') {
    return;
  }
  const simulatorUpdateInterval = setInterval(() => {
    const {connections} = store.getState();
    querySimulatorDevices()
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
            simulator.availability === '(available)';

          if (isRunning && !currentDeviceIDs.has(simulator.udid)) {
            // create device
            store.dispatch({
              type: 'REGISTER_DEVICE',
              payload: new IOSDevice(
                simulator.udid,
                'emulator',
                simulator.name,
              ),
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
      })
      .catch(err => {
        console.error(err);
        clearInterval(simulatorUpdateInterval);
      });
  }, 3000);
};
