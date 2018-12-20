/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ChildProcess} from 'child_process';
import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';
import type {DeviceType} from '../devices/BaseDevice';
import BaseDevice from '../devices/BaseDevice';
import type {PersistedState} from '../plugins/crash_reporter';
import {RecurringError} from '../utils/errors';
import {promisify} from 'util';
import path from 'path';
import child_process from 'child_process';
const execFile = child_process.execFile;
import IOSDevice from '../devices/IOSDevice';
import iosUtil from '../fb-stubs/iOSContainerUtility';
import isProduction from '../utils/isProduction.js';
import GK from '../fb-stubs/GK';
import fs from 'fs';
import os from 'os';
import util from 'util';
import {setPluginState} from '../reducers/pluginStates.js';
import {FlipperDevicePlugin, FlipperPlugin} from '../plugin.js';
import type {State as PluginStatesState} from '../reducers/pluginStates.js';

type iOSSimulatorDevice = {|
  state: 'Booted' | 'Shutdown' | 'Shutting Down',
  availability?: string,
  isAvailable?: 'YES' | 'NO',
  name: string,
  udid: string,
|};

type Crash = {|
  callstack: string,
  reason: string,
  name: string,
|};

type IOSDeviceParams = {udid: string, type: DeviceType, name: string};

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
const portForwarders: Array<ChildProcess> = GK.get('flipper_ios_device_support')
  ? [forwardPort(8089, 8079), forwardPort(8088, 8078)]
  : [];
window.addEventListener('beforeunload', () => {
  portForwarders.forEach(process => process.kill());
});

export function parseCrashLog(content: string): Crash {
  const regex = /Exception Type: *[\w]*/;
  const arr = regex.exec(content);
  const exceptionString = arr ? arr[0] : '';
  const exceptionRegex = /[\w]*$/;
  const tmp = exceptionRegex.exec(exceptionString);
  const exception =
    tmp && tmp[0].length ? tmp[0] : 'Cannot figure out the cause';
  const crash = {
    callstack: content,
    name: exception,
    reason: exception,
  };
  return crash;
}
export function parsePath(content: string): ?string {
  const regex = /Path: *[\w\-\/\.\t\ \_\%]*\n/;
  const arr = regex.exec(content);
  if (!arr || arr.length <= 0) {
    return null;
  }
  const pathString = arr[0];
  const pathRegex = /[\w\-\/\.\t\ \_\%]*\n/;
  const tmp = pathRegex.exec(pathString);
  if (!tmp || tmp.length == 0) {
    return null;
  }
  const path = tmp[0];
  return path.trim();
}

export function getPersistedState(
  pluginKey: string,
  persistingPlugin: ?Class<FlipperPlugin<> | FlipperDevicePlugin<>>,
  pluginStates: PluginStatesState,
): ?PersistedState {
  if (!persistingPlugin) {
    return null;
  }
  const persistedState = {
    ...persistingPlugin.defaultPersistedState,
    ...pluginStates[pluginKey],
  };
  return persistedState;
}

export function getPluginKey(
  selectedDevice: ?BaseDevice,
  pluginID: string,
): string {
  return `${selectedDevice?.serial || 'unknown'}#${pluginID}`;
}

export function getNewPersisitedStateFromCrashLog(
  persistedState: ?PersistedState,
  persistingPlugin: Class<FlipperDevicePlugin<> | FlipperPlugin<>>,
  content: string,
): ?PersistedState {
  const crash = parseCrashLog(content);
  if (!persistingPlugin.persistedStateReducer) {
    return null;
  }
  const newPluginState = persistingPlugin.persistedStateReducer(
    persistedState,
    'crash-report',
    crash,
  );
  return newPluginState;
}

export function shouldShowCrashNotification(
  baseDevice: ?BaseDevice,
  content: string,
): boolean {
  const appPath = parsePath(content);
  const serial: string = baseDevice?.serial || 'unknown';
  if (!appPath || !appPath.includes(serial)) {
    // Do not show notifications for the app which are not the selected one
    return false;
  }
  return true;
}

function parseCrashLogAndUpdateState(store: Store, content: string) {
  if (
    !shouldShowCrashNotification(
      store.getState().connections.selectedDevice,
      content,
    )
  ) {
    return;
  }
  const pluginID = 'CrashReporter';
  const pluginKey = getPluginKey(
    store.getState().connections.selectedDevice,
    pluginID,
  );
  const persistingPlugin: ?Class<
    FlipperDevicePlugin<> | FlipperPlugin<>,
  > = store.getState().plugins.devicePlugins.get('CrashReporter');
  if (!persistingPlugin) {
    return;
  }
  const pluginStates = store.getState().pluginStates;
  const persistedState = getPersistedState(
    pluginKey,
    persistingPlugin,
    pluginStates,
  );
  const newPluginState = getNewPersisitedStateFromCrashLog(
    persistedState,
    persistingPlugin,
    content,
  );
  if (newPluginState && persistedState !== newPluginState) {
    store.dispatch(
      setPluginState({
        pluginKey,
        state: newPluginState,
      }),
    );
  }
}

function addFileWatcherForiOSCrashLogs(store: Store, logger: Logger) {
  const dir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');
  if (!fs.existsSync(dir)) {
    // Directory doesn't exist
    return;
  }
  fs.watch(dir, (eventType, filename) => {
    // We just parse the crash logs with extension `.crash`
    const checkFileExtension = /.crash$/.exec(filename);
    if (!filename || !checkFileExtension) {
      return;
    }
    fs.readFile(path.join(dir, filename), 'utf8', function(err, data) {
      if (store.getState().connections.selectedDevice?.os != 'iOS') {
        // If the selected device is not iOS don't show crash notifications
        return;
      }
      if (err) {
        console.error(err);
        return;
      }
      parseCrashLogAndUpdateState(store, util.format(data));
    });
  });
}

function queryDevices(store: Store, logger: Logger): Promise<void> {
  const {connections} = store.getState();
  const currentDeviceIDs: Set<string> = new Set(
    connections.devices
      .filter(device => device instanceof IOSDevice)
      .map(device => device.serial),
  );
  return Promise.all([getActiveSimulators(), getActiveDevices()])
    .then(([a, b]) => a.concat(b))
    .then(activeDevices => {
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
          store.dispatch({
            type: 'REGISTER_DEVICE',
            payload: new IOSDevice(udid, type, name),
          });
        }
      }

      if (currentDeviceIDs.size > 0) {
        currentDeviceIDs.forEach(id =>
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
  return promisify(execFile)('xcrun', ['simctl', 'list', 'devices', '--json'], {
    encoding: 'utf8',
  })
    .then(({stdout}) => JSON.parse(stdout).devices)
    .then(simulatorDevices => {
      const simulators: Array<iOSSimulatorDevice> = Object.values(
        simulatorDevices,
        // $FlowFixMe
      ).reduce((acc, cv) => acc.concat(cv), []);

      return simulators
        .filter(
          simulator =>
            simulator.state === 'Booted' &&
            // For some users "availability" is set, for others it's "isAvailable"
            // It's not clear which key is set, so we are checking both.
            (simulator.availability === '(available)' ||
              simulator.isAvailable === 'YES'),
        )
        .map(simulator => {
          return {
            udid: simulator.udid,
            type: 'emulator',
            name: simulator.name,
          };
        });
    });
}

function getActiveDevices(): Promise<Array<IOSDeviceParams>> {
  return iosUtil.targets().catch(e => {
    console.error(new RecurringError(e.message));
    return [];
  });
}

export default (store: Store, logger: Logger) => {
  // monitoring iOS devices only available on MacOS.
  if (process.platform !== 'darwin') {
    return;
  }
  addFileWatcherForiOSCrashLogs(store, logger);
  queryDevices(store, logger)
    .then(() => {
      const simulatorUpdateInterval = setInterval(() => {
        queryDevices(store, logger).catch(err => {
          console.error(err);
          clearInterval(simulatorUpdateInterval);
        });
      }, 3000);
    })
    .catch(console.error);
};
