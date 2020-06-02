/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ChildProcess} from 'child_process';
import {Store} from '../reducers/index';
import {setXcodeDetected} from '../reducers/application';
import {Logger} from '../fb-interfaces/Logger';
import {DeviceType} from '../devices/BaseDevice';
import {promisify} from 'util';
import path from 'path';
import child_process from 'child_process';
const execFile = child_process.execFile;
import iosUtil from '../utils/iOSContainerUtility';
import IOSDevice from '../devices/IOSDevice';
import isProduction from '../utils/isProduction';
import GK from '../fb-stubs/GK';
import {registerDeviceCallbackOnPlugins} from '../utils/onRegisterDevice';
type iOSSimulatorDevice = {
  state: 'Booted' | 'Shutdown' | 'Shutting Down';
  availability?: string;
  isAvailable?: 'YES' | 'NO' | true | false;
  name: string;
  udid: string;
};

type IOSDeviceParams = {udid: string; type: DeviceType; name: string};

function isAvailable(simulator: iOSSimulatorDevice): boolean {
  // For some users "availability" is set, for others it's "isAvailable"
  // It's not clear which key is set, so we are checking both.
  // We've also seen isAvailable return "YES" and true, depending on version.
  return (
    simulator.availability === '(available)' ||
    simulator.isAvailable === 'YES' ||
    simulator.isAvailable === true
  );
}

const portforwardingClient = isProduction()
  ? path.resolve(
      __dirname,
      'PortForwardingMacApp.app/Contents/MacOS/PortForwardingMacApp',
    )
  : 'PortForwardingMacApp.app/Contents/MacOS/PortForwardingMacApp';

function forwardPort(port: number, multiplexChannelPort: number) {
  return execFile(portforwardingClient, [
    `-portForward=${port}`,
    `-multiplexChannelPort=${multiplexChannelPort}`,
  ]);
}
// start port forwarding server for real device connections
const portForwarders: Array<ChildProcess> = true
  ? [forwardPort(8089, 8079), forwardPort(8088, 8078)]
  : [];

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    portForwarders.forEach((process) => process.kill());
  });
}

async function queryDevices(store: Store, logger: Logger): Promise<void> {
  if (!(await checkIfDevicesCanBeQueryied(store))) {
    return;
  }
  await checkXcodeVersionMismatch(store);
  const {connections} = store.getState();
  const currentDeviceIDs: Set<string> = new Set(
    connections.devices
      .filter((device) => device instanceof IOSDevice)
      .map((device) => device.serial),
  );
  return Promise.all([getActiveSimulators(), getActiveDevices()])
    .then(([a, b]) => a.concat(b))
    .then((activeDevices) => {
      for (const {udid, type, name} of activeDevices) {
        if (currentDeviceIDs.has(udid)) {
          currentDeviceIDs.delete(udid);
        } else {
          logger.track('usage', 'register-device', {
            os: 'iOS',
            type: type,
            name: name,
            serial: udid,
          });
          const iOSDevice = new IOSDevice(udid, type, name);
          iOSDevice.loadDevicePlugins(store.getState().plugins.devicePlugins);
          store.dispatch({
            type: 'REGISTER_DEVICE',
            payload: iOSDevice,
          });
          registerDeviceCallbackOnPlugins(
            store,
            store.getState().plugins.devicePlugins,
            store.getState().plugins.clientPlugins,
            iOSDevice,
          );
        }
      }

      if (currentDeviceIDs.size > 0) {
        currentDeviceIDs.forEach((id) =>
          logger.track('usage', 'unregister-device', {os: 'iOS', serial: id}),
        );
        store.dispatch({
          type: 'UNREGISTER_DEVICES',
          payload: currentDeviceIDs,
        });
      }
    });
}

function getActiveSimulators(): Promise<Array<IOSDeviceParams>> {
  const deviceSetPath = process.env.DEVICE_SET_PATH
    ? ['--set', process.env.DEVICE_SET_PATH]
    : [];
  return promisify(execFile)(
    'xcrun',
    ['simctl', ...deviceSetPath, 'list', 'devices', '--json'],
    {
      encoding: 'utf8',
    },
  )
    .then(({stdout}) => JSON.parse(stdout).devices)
    .then((simulatorDevices: Array<iOSSimulatorDevice>) => {
      const simulators: Array<iOSSimulatorDevice> = Object.values(
        simulatorDevices,
      ).reduce((acc: Array<iOSSimulatorDevice>, cv) => acc.concat(cv), []);

      return simulators
        .filter(
          (simulator) => simulator.state === 'Booted' && isAvailable(simulator),
        )
        .map((simulator) => {
          return {
            udid: simulator.udid,
            type: 'emulator',
            name: simulator.name,
          } as IOSDeviceParams;
        });
    })
    .catch((_) => []);
}

function getActiveDevices(): Promise<Array<IOSDeviceParams>> {
  return iosUtil.targets().catch((e) => {
    console.error(e.message);
    return [];
  });
}

function queryDevicesForever(store: Store, logger: Logger) {
  return queryDevices(store, logger)
    .then(() => {
      // It's important to schedule the next check AFTER the current one has completed
      // to avoid simultaneous queries which can cause multiple user input prompts.
      setTimeout(() => queryDevicesForever(store, logger), 3000);
    })
    .catch((err) => {
      console.error(err);
    });
}

let xcodeVersionMismatchFound = false;
async function checkXcodeVersionMismatch(store: Store) {
  if (xcodeVersionMismatchFound) {
    return;
  }
  const exec = promisify(child_process.exec);
  try {
    let {stdout: xcodeCLIVersion} = await exec('xcode-select -p');
    xcodeCLIVersion = xcodeCLIVersion.trim();
    const {stdout} = await exec('ps aux | grep CoreSimulator');
    for (const line of stdout.split('\n')) {
      const match = line.match(
        /\/Applications\/Xcode[^/]*\.app\/Contents\/Developer/,
      );
      const runningVersion = match && match.length > 0 ? match[0].trim() : null;
      if (runningVersion && runningVersion !== xcodeCLIVersion) {
        const errorMessage = `Xcode version mismatch: Simulator is running from "${runningVersion}" while Xcode CLI is "${xcodeCLIVersion}". Running "xcode-select --switch ${runningVersion}" can fix this.`;
        store.dispatch({
          type: 'SERVER_ERROR',
          payload: {
            message: errorMessage,
            details:
              "You might want to run 'sudo xcode-select -s /Applications/Xcode.app/Contents/Developer'",
            urgent: true,
          },
        });
        // Fire a console.error as well, so that it gets reported to the backend.
        console.error(errorMessage);
        xcodeVersionMismatchFound = true;
        break;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

let canQueryDevices: boolean | undefined = undefined;

async function checkIfDevicesCanBeQueryied(store: Store): Promise<boolean> {
  if (canQueryDevices !== undefined) {
    return canQueryDevices;
  }
  try {
    const exec = promisify(child_process.exec);
    // make sure we can use instruments (it will throw otherwise)
    await exec('instruments -s devices');
    return (canQueryDevices = true);
  } catch (e) {
    store.dispatch({
      type: 'SERVER_ERROR',
      payload: {
        message:
          'It looks like XCode was not installed properly. Further actions are required if you want to use an iOS emulator.',
        details:
          "You might want to run 'sudo xcode-select -s /Applications/Xcode.app/Contents/Developer'",
        error: e,
      },
    });
    return (canQueryDevices = false);
  }
}

async function isXcodeDetected(): Promise<boolean> {
  return promisify(child_process.exec)('xcode-select -p')
    .then((_) => true)
    .catch((_) => false);
}

export async function getActiveDevicesAndSimulators(): Promise<
  Array<IOSDevice>
> {
  const activeDevices: Array<Array<IOSDeviceParams>> = await Promise.all([
    getActiveSimulators(),
    getActiveDevices(),
  ]);
  const allDevices = activeDevices[0].concat(activeDevices[1]);
  return allDevices.map((device) => {
    const {udid, type, name} = device;
    return new IOSDevice(udid, type, name);
  });
}

export default (store: Store, logger: Logger) => {
  // monitoring iOS devices only available on MacOS.
  if (process.platform !== 'darwin') {
    return;
  }
  if (!store.getState().settingsState.enableIOS) {
    return;
  }
  isXcodeDetected()
    .then((isDetected) => {
      store.dispatch(setXcodeDetected(isDetected));
      return isDetected;
    })
    .then((isDetected) =>
      isDetected ? queryDevicesForever(store, logger) : Promise.resolve(),
    );
};
