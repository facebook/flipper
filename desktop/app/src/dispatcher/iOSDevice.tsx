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
import {addErrorNotification} from '../reducers/notifications';
import {getStaticPath} from '../utils/pathUtils';
import {destroyDevice} from '../reducers/connections';
import {IOSBridge, makeIOSBridge} from '../utils/IOSBridge';

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
      // This happens on app reloads and doesn't need to be treated as an error.
      console.warn('Port forwarding app failed to start', err, stdout, stderr);
    },
  );
  console.log('Port forwarding app started', childProcess);
  childProcess.addListener('error', (err) =>
    console.warn('Port forwarding app error', err),
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

export function getAllPromisesForQueryingDevices(
  store: Store,
  logger: Logger,
  iosBridge: IOSBridge,
  isXcodeDetected: boolean,
): Array<Promise<any>> {
  const promArray = [
    getActiveDevices(
      store.getState().settingsState.idbPath,
      store.getState().settingsState.enablePhysicalIOS,
    ).then((devices: IOSDeviceParams[]) => {
      processDevices(store, logger, iosBridge, devices, 'physical');
    }),
  ];
  if (isXcodeDetected) {
    promArray.push(
      ...[
        checkXcodeVersionMismatch(store),
        getSimulators(store, true).then((devices) => {
          processDevices(store, logger, iosBridge, devices, 'emulator');
        }),
      ],
    );
  }
  return promArray;
}

async function queryDevices(
  store: Store,
  logger: Logger,
  iosBridge: IOSBridge,
): Promise<any> {
  const isXcodeInstalled = await iosUtil.isXcodeDetected();
  return Promise.all(
    getAllPromisesForQueryingDevices(
      store,
      logger,
      iosBridge,
      isXcodeInstalled,
    ),
  );
}

function processDevices(
  store: Store,
  logger: Logger,
  iosBridge: IOSBridge,
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
      // clean up offline device
      destroyDevice(store, logger, udid);
      logger.track('usage', 'register-device', {
        os: 'iOS',
        type: type,
        name: name,
        serial: udid,
      });
      const iOSDevice = new IOSDevice(iosBridge, udid, type, name);
      iOSDevice.loadDevicePlugins(
        store.getState().plugins.devicePlugins,
        store.getState().connections.enabledDevicePlugins,
      );
      store.dispatch({
        type: 'REGISTER_DEVICE',
        payload: iOSDevice,
      });
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
  store: Store,
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
    .catch((e: Error) => {
      console.warn('Failed to query simulators:', e);
      if (e.message.includes('Xcode license agreements')) {
        store.dispatch(
          addErrorNotification(
            'Xcode license requires approval',
            'The Xcode license agreement has changed. You need to either open Xcode and agree to the terms or run `sudo xcodebuild -license` in a Terminal to allow simulators to work with Flipper.',
          ),
        );
      }
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

function getActiveDevices(
  idbPath: string,
  isPhysicalDeviceEnabled: boolean,
): Promise<Array<IOSDeviceParams>> {
  return iosUtil.targets(idbPath, isPhysicalDeviceEnabled).catch((e) => {
    console.error('Failed to get active iOS devices:', e.message);
    return [];
  });
}

function queryDevicesForever(
  store: Store,
  logger: Logger,
  iosBridge: IOSBridge,
) {
  return queryDevices(store, logger, iosBridge)
    .then(() => {
      // It's important to schedule the next check AFTER the current one has completed
      // to avoid simultaneous queries which can cause multiple user input prompts.
      setTimeout(() => queryDevicesForever(store, logger, iosBridge), 3000);
    })
    .catch((err) => {
      console.warn('Failed to continuously query devices:', err);
    });
}

export function parseXcodeFromCoreSimPath(
  line: string,
): RegExpMatchArray | null {
  return line.match(/\/[\/\w@)(\-\+]*\/Xcode[^/]*\.app\/Contents\/Developer/);
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
      const match = parseXcodeFromCoreSimPath(line);
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
    console.error('Failed to determine Xcode version:', e);
  }
}

export default (store: Store, logger: Logger) => {
  if (!store.getState().settingsState.enableIOS) {
    return;
  }
  iosUtil.isXcodeDetected().then((isDetected) => {
    store.dispatch(setXcodeDetected(isDetected));
    if (store.getState().settingsState.enablePhysicalIOS) {
      startDevicePortForwarders();
    }
    return makeIOSBridge(
      store.getState().settingsState.idbPath,
      isDetected,
    ).then((iosBridge) => queryDevicesForever(store, logger, iosBridge));
  });
};
