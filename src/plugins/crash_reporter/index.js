/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow
 */

import {
  FlipperDevicePlugin,
  Device,
  View,
  styled,
  FlexColumn,
  FlexRow,
  ContextMenu,
  clipboard,
  Button,
  FlipperPlugin,
  getPluginKey,
  getPersistedState,
  BaseDevice,
  shouldParseAndroidLog,
} from 'flipper';
import fs from 'fs';
import os from 'os';
import util from 'util';
import path from 'path';
import type {Notification} from '../../plugin';
import type {Store, DeviceLogEntry, OS} from 'flipper';

export type Crash = {|
  notificationID: string,
  callstack: string,
  reason: string,
  name: string,
|};

export type CrashLog = {|
  callstack: string,
  reason: string,
  name: string,
|};

export type PersistedState = {
  crashes: Array<Crash>,
};

const Title = styled(View)({
  fontWeight: 'bold',
  fontSize: '100%',
  color: 'red',
});

const Value = styled(View)({
  paddingLeft: '8px',
  fontSize: '100%',
  fontFamily: 'Monospace',
  maxHeight: '200px',
  overflow: 'scroll',
});

const RootColumn = styled(FlexColumn)({
  paddingLeft: '16px',
  paddingRight: '16px',
  paddingTop: '8px',
  overflow: 'scroll',
});

const CrashRow = styled(FlexRow)({
  paddingTop: '8px',
});

const CallStack = styled('pre')({
  fontFamily: 'Monospace',
  fontSize: '100%',
  paddingLeft: '8px',
  maxHeight: '500px',
  overflow: 'scroll',
});

export function getNewPersisitedStateFromCrashLog(
  persistedState: ?PersistedState,
  persistingPlugin: Class<FlipperDevicePlugin<> | FlipperPlugin<>>,
  content: string,
  os: ?OS,
): ?PersistedState {
  const persistedStateReducer = persistingPlugin.persistedStateReducer;
  if (!os || !persistedStateReducer) {
    return null;
  }
  const crash = parseCrashLog(content, os);
  const newPluginState = persistedStateReducer(
    persistedState,
    'crash-report',
    crash,
  );
  return newPluginState;
}

export function parseCrashLogAndUpdateState(
  store: Store,
  content: string,
  setPersistedState: (
    pluginKey: string,
    newPluginState: ?PersistedState,
  ) => void,
) {
  const os = store.getState().connections.selectedDevice?.os;
  if (
    !shouldShowCrashNotification(
      store.getState().connections.selectedDevice,
      content,
      os,
    )
  ) {
    return;
  }
  const pluginID = CrashReporterPlugin.id;
  const pluginKey = getPluginKey(
    null,
    store.getState().connections.selectedDevice,
    pluginID,
  );
  const persistingPlugin: ?Class<
    FlipperDevicePlugin<> | FlipperPlugin<>,
  > = store.getState().plugins.devicePlugins.get(CrashReporterPlugin.id);
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
    os,
  );
  setPersistedState(pluginKey, newPluginState);
}

export function shouldShowCrashNotification(
  baseDevice: ?BaseDevice,
  content: string,
  os: ?OS,
): boolean {
  if (os && os === 'Android') {
    return true;
  }
  const appPath = parsePath(content);
  const serial: string = baseDevice?.serial || 'unknown';
  if (!appPath || !appPath.includes(serial)) {
    // Do not show notifications for the app which are not the selected one
    return false;
  }
  return true;
}

export function parseCrashLog(content: string, os: OS): CrashLog {
  const stubString = 'Cannot figure out the cause';
  switch (os) {
    case 'iOS': {
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
    case 'Android': {
      const regForName = /.*\n/;
      const nameRegArr = regForName.exec(content);
      let name = nameRegArr ? nameRegArr[0] : stubString;
      const regForCallStack = /\tat[\w\s\n.$&+,:;=?@#|'<>.^*()%!-]*$/;
      const callStackArray = regForCallStack.exec(content);
      const callStack = callStackArray ? callStackArray[0] : '';
      let remainingString =
        callStack.length > 0 ? content.replace(callStack, '') : '';
      if (remainingString[remainingString.length - 1] === '\n') {
        remainingString = remainingString.slice(0, -1);
      }
      const reason =
        remainingString.length > 0
          ? remainingString.split('\n').pop()
          : stubString;
      if (name[name.length - 1] === '\n') {
        name = name.slice(0, -1);
      }
      const crash = {
        callstack: content,
        name: name,
        reason: reason,
      };
      return crash;
    }
    default: {
      throw new Error('Unsupported OS');
    }
  }
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

function addFileWatcherForiOSCrashLogs(
  store: Store,
  setPersistedState: (
    pluginKey: string,
    newPluginState: ?PersistedState,
  ) => void,
) {
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
      parseCrashLogAndUpdateState(store, util.format(data), setPersistedState);
    });
  });
}

export default class CrashReporterPlugin extends FlipperDevicePlugin<
  *,
  *,
  PersistedState,
> {
  static defaultPersistedState = {
    crashes: [],
  };

  static supportsDevice(device: Device) {
    return device.os === 'iOS' || device.os === 'Android';
  }

  static notificationID: number = 0;
  /*
   * Reducer to process incoming "send" messages from the mobile counterpart.
   */
  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: Object,
  ): PersistedState => {
    if (method === 'crash-report' || method === 'flipper-crash-report') {
      CrashReporterPlugin.notificationID++;
      const mergedState: PersistedState = {
        crashes: persistedState.crashes.concat([
          {
            notificationID: CrashReporterPlugin.notificationID.toString(), // All notifications are unique
            callstack: payload.callstack,
            name: payload.name,
            reason: payload.reason,
          },
        ]),
      };
      return mergedState;
    }
    return persistedState;
  };

  static trimCallStackIfPossible = (callstack: string): string => {
    let regex = /Application Specific Information:/;
    const query = regex.exec(callstack);
    return query ? callstack.substring(0, query.index) : callstack;
  };
  /*
   * Callback to provide the currently active notifications.
   */
  static getActiveNotifications = (
    persistedState: PersistedState,
  ): Array<Notification> => {
    return persistedState.crashes.map((crash: Crash) => {
      const id = crash.notificationID;
      return {
        id,
        message: CrashReporterPlugin.trimCallStackIfPossible(crash.callstack),
        severity: 'error',
        title: 'CRASH: ' + crash.name + ' ' + crash.reason,
        action: id,
      };
    });
  };

  /*
   * This function gets called whenever the device is registered
   */
  static onRegisterDevice = (
    store: Store,
    baseDevice: BaseDevice,
    setPersistedState: (
      pluginKey: string,
      newPluginState: ?PersistedState,
    ) => void,
  ): void => {
    if (baseDevice.os.includes('iOS')) {
      addFileWatcherForiOSCrashLogs(store, setPersistedState);
    } else {
      const referenceDate = new Date();
      (function(
        store: Store,
        date: Date,
        setPersistedState: (
          pluginKey: string,
          newPluginState: ?PersistedState,
        ) => void,
      ) {
        let androidLog: string = '';
        let androidLogUnderProcess = false;
        let timer = null;
        baseDevice.addLogListener((entry: DeviceLogEntry) => {
          if (shouldParseAndroidLog(entry, referenceDate)) {
            if (androidLogUnderProcess) {
              androidLog += '\n' + entry.message;
              androidLog = androidLog.trim();
              if (timer) {
                clearTimeout(timer);
              }
            } else {
              androidLog = entry.message;
              androidLogUnderProcess = true;
            }
            timer = setTimeout(() => {
              if (androidLog.length > 0) {
                parseCrashLogAndUpdateState(
                  store,
                  androidLog,
                  setPersistedState,
                );
              }
              androidLogUnderProcess = false;
              androidLog = '';
            }, 50);
          }
        });
      })(store, referenceDate, setPersistedState);
    }
  };
  openInLogs = (callstack: string) => {
    this.props.selectPlugin('DeviceLogs', callstack);
  };

  render() {
    let crash: ?Crash =
      this.props.persistedState.crashes.length > 0
        ? this.props.persistedState.crashes[
            this.props.persistedState.crashes.length - 1
          ]
        : null;

    if (this.props.deepLinkPayload) {
      const id = this.props.deepLinkPayload;
      const index = this.props.persistedState.crashes.findIndex(elem => {
        return elem.notificationID === id;
      });
      if (index >= 0) {
        crash = this.props.persistedState.crashes[index];
      }
    }

    if (crash) {
      const callstackString = crash.callstack;
      return (
        <RootColumn>
          <CrashRow>
            <Title>Name</Title>
            <Value>{crash.name}</Value>
          </CrashRow>
          <CrashRow>
            <Title>Reason</Title>
            <Value>{crash.reason}</Value>
          </CrashRow>
          <CrashRow>
            <Title>CallStack</Title>
          </CrashRow>
          <CrashRow>
            <ContextMenu
              items={[
                {
                  label: 'copy',
                  click: () => {
                    clipboard.writeText(callstackString);
                  },
                },
              ]}>
              <CallStack>{callstackString}</CallStack>
            </ContextMenu>
          </CrashRow>
          {this.device.os == 'Android' && (
            <CrashRow>
              <Button
                onClick={() => {
                  //$FlowFixMe: checked that crash is not undefined
                  this.openInLogs(crash.callstack);
                }}>
                Open in Logs
              </Button>
            </CrashRow>
          )}
        </RootColumn>
      );
    }
    return (
      <RootColumn>
        <Title>
          Dedicated space to debug crashes. Look out for crash notifications
        </Title>
      </RootColumn>
    );
  }
}
