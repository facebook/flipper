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
import type {DeviceType} from 'flipper-plugin';
import {promisify} from 'util';
import path from 'path';
import child_process from 'child_process';
const execFile = child_process.execFile;
import iosUtil from '../utils/iOSContainerUtility';
import IOSDevice from '../devices/IOSDevice';
import {registerDeviceCallbackOnPlugins} from '../utils/onRegisterDevice';
import {addErrorNotification} from '../reducers/notifications';
import {getStaticPath} from '../utils/pathUtils';

type iOSSimulatorDevice = {
  state: 'Booted' | 'Shutdown' | 'Shutting Down';
  availability?: string;
  isAvailable?: 'YES' | 'NO' | true | false;
  name: string;
  udid: string;
};

export type IOSDeviceParams = {
  udid: string;
  type: DeviceType;
  name: string;
  deviceTypeIdentifier?: string;
  state?: string;
};

const exec = promisify(child_process.exec);

let portForwarders: Array<ChildProcess> = [];

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

const portforwardingClient = path.join(
  getStaticPath(),
  'PortForwardingMacApp.app/Contents/MacOS/PortForwardingMacApp',
);

function forwardPort(port: number, multiplexChannelPort: number) {
  const childProcess = execFile(
    portforwardingClient,
    [`-portForward=${port}`, `-multiplexChannelPort=${multiplexChannelPort}`],
    (err, stdout, stderr) => {
      console.error('Port forwarding app failed to start', err, stdout, stderr);
    },
  );
  console.log('Port forwarding app started', childProcess);
  childProcess.addListener('error', (err) =>
    console.error('Port forwarding app error', err),
  );
  childProcess.addListener('exit', (code) =>
    console.log(`Port forwarding app exited with code ${code}`),
  );
  return childProcess;
}

function startDevicePortForwarders(): void {
  if (portForwarders.length > 0) {
    // Only ever start them once.
    return;
  }
  // start port forwarding server for real device connections
  portForwarders = [forwardPort(8089, 8079), forwardPort(8088, 8078)];
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    portForwarders.forEach((process) => process.kill());
  });
}

async function queryDevices(store: Store, logger: Logger): Promise<any> {
  return Promise.all([
    checkXcodeVersionMismatch(store),
    getSimulators(true).then((devices) => {
      processDevices(store, logger, devices, 'emulator');
    }),
    getActiveDevices(store.getState().settingsState.idbPath).then(
      (devices: IOSDeviceParams[]) => {
        processDevices(store, logger, devices, 'physical');
      },
    ),
  ]);
}

function processDevices(
  store: Store,
  logger: Logger,
  activeDevices: IOSDeviceParams[],
  type: 'physical' | 'emulator',
) {
  const {connections} = store.getState();
  const currentDeviceIDs: Set<string> = new Set(
    connections.devices
      .filter(
        (device) =>
          device instanceof IOSDevice &&
          device.deviceType === type &&
          device.connected.get(),
      )
      .map((device) => device.serial),
  );

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

  currentDeviceIDs.forEach((id) => {
    const device = store
      .getState()
      .connections.devices.find((device) => device.serial === id);
    device?.disconnect();
  });
}

function getDeviceSetPath() {
  return process.env.DEVICE_SET_PATH
    ? ['--set', process.env.DEVICE_SET_PATH]
    : [];
}

export function getSimulators(
  bootedOnly: boolean,
): Promise<Array<IOSDeviceParams>> {
  return promisify(execFile)(
    'xcrun',
    ['simctl', ...getDeviceSetPath(), 'list', 'devices', '--json'],
    {
      encoding: 'utf8',
    },
  )
    .then(({stdout}) => JSON.parse(stdout).devices)
    .then((simulatorDevices: Array<iOSSimulatorDevice>) => {
      const simulators = Object.values(simulatorDevices).flat();
      return simulators
        .filter(
          (simulator) =>
            (!bootedOnly || simulator.state === 'Booted') &&
            isAvailable(simulator),
        )
        .map((simulator) => {
          return {
            ...simulator,
            type: 'emulator',
          } as IOSDeviceParams;
        });
    })
    .catch((e) => {
      console.error(e);
      return Promise.resolve([]);
    });
}

export async function launchSimulator(udid: string): Promise<any> {
  await promisify(execFile)(
    'xcrun',
    ['simctl', ...getDeviceSetPath(), 'boot', udid],
    {encoding: 'utf8'},
  );
  await promisify(execFile)('open', ['-a', 'simulator']);
}

function getActiveDevices(idbPath: string): Promise<Array<IOSDeviceParams>> {
  return iosUtil.targets(idbPath).catch((e) => {
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
        const errorMessage = `Xcode version mismatch: Simulator is running from "${runningVersion}" while Xcode CLI is "${xcodeCLIVersion}". Running "xcode-select --switch ${runningVersion}" can fix this. For example: "sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"`;
        store.dispatch(
          addErrorNotification('Xcode version mismatch', errorMessage),
        );
        xcodeVersionMismatchFound = true;
        break;
      }
    }
  } catch (e) {
    console.error(e);
  }
}
async function isXcodeDetected(): Promise<boolean> {
  return exec('xcode-select -p')
    .then((_) => true)
    .catch((_) => false);
}

export async function getActiveDevicesAndSimulators(
  store: Store,
): Promise<Array<IOSDevice>> {
  const activeDevices: Array<Array<IOSDeviceParams>> = await Promise.all([
    getSimulators(true),
    getActiveDevices(store.getState().settingsState.idbPath),
  ]);
  const allDevices = activeDevices[0].concat(activeDevices[1]);
  return allDevices.map((device) => {
    const {udid, type, name} = device;
    return new IOSDevice(udid, type, name);
  });
}

export default (store: Store, logger: Logger) => {
  if (!store.getState().settingsState.enableIOS) {
    return;
  }
  isXcodeDetected().then((isDetected) => {
    store.dispatch(setXcodeDetected(isDetected));
    if (isDetected) {
      if (store.getState().settingsState.enablePhysicalIOS) {
        startDevicePortForwarders();
      }
      return queryDevicesForever(store, logger);
    }
  });
};
