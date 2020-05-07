/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
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
  Text,
  colors,
  Toolbar,
  Spacer,
  Select,
} from 'flipper';
import unicodeSubstring from 'unicode-substring';
import fs from 'fs';
import os from 'os';
import util from 'util';
import path from 'path';
import {promisify} from 'util';
import type {Notification} from 'flipper';
import type {Store, DeviceLogEntry, OS, Props} from 'flipper';
import {Component} from 'react';

type HeaderRowProps = {
  title: string,
  value: string,
};
type openLogsCallbackType = () => void;

type CrashReporterBarProps = {|
  openLogsCallback?: openLogsCallbackType,
  crashSelector: CrashSelectorProps,
|};

type CrashSelectorProps = {|
  crashes: ?{[key: string]: string},
  orderedIDs: ?Array<string>,
  selectedCrashID: ?string,
  onCrashChange: ?(string) => void,
|};

export type Crash = {|
  notificationID: string,
  callstack: ?string,
  reason: string,
  name: string,
  date: Date,
|};

export type CrashLog = {|
  callstack: string,
  reason: string,
  name: string,
  date: ?Date,
|};

export type PersistedState = {
  crashes: Array<Crash>,
};

type State = {
  crash: ?Crash,
};

const Padder = styled.div(
  ({paddingLeft, paddingRight, paddingBottom, paddingTop}) => ({
    paddingLeft: paddingLeft || 0,
    paddingRight: paddingRight || 0,
    paddingBottom: paddingBottom || 0,
    paddingTop: paddingTop || 0,
  }),
);

const Title = styled(Text)({
  fontWeight: 'bold',
  color: colors.greyTint3,
  height: 'auto',
  width: 200,
  textOverflow: 'ellipsis',
});

const Line = styled(View)({
  backgroundColor: colors.greyTint2,
  height: 1,
  width: 'auto',
  marginTop: 2,
  flexShrink: 0,
});

const Container = styled(FlexColumn)({
  overflow: 'auto',
  flexShrink: 0,
});

const Value = styled(Text)({
  fontWeight: 'bold',
  color: colors.greyTint3,
  height: 'auto',
  maxHeight: 200,
  flexGrow: 1,
  textOverflow: 'ellipsis',
  whiteSpace: 'normal',
  wordWrap: 'break-word',
  lineHeight: 2,
  marginLeft: 8,
  marginRight: 8,
  overflow: 'hidden',
});

const FlexGrowColumn = styled(FlexColumn)({
  flexGrow: 1,
});

const PluginRootContainer = styled(FlexColumn)({
  height: '100%',
});

const ScrollableColumn = styled(FlexGrowColumn)({
  overflow: 'auto',
  height: 'auto',
});

const StyledFlexGrowColumn = styled(FlexColumn)({
  flexGrow: 1,
});

const StyledFlexRowColumn = styled(FlexRow)({
  aligItems: 'center',
  justifyContent: 'center',
  height: '100%',
});

const StyledFlexColumn = styled(StyledFlexGrowColumn)({
  justifyContent: 'center',
  alignItems: 'center',
});

const MatchParentHeightComponent = styled(FlexRow)({
  height: '100%',
});

const ButtonGroupContainer = styled(FlexRow)({
  paddingLeft: 4,
  paddingTop: 2,
  paddingBottom: 2,
  height: '100%',
});

const StyledSelectContainer = styled(FlexRow)({
  paddingLeft: 8,
  paddingTop: 2,
  paddingBottom: 2,
  height: '100%',
});

const StyledSelect = styled(Select)({
  height: '100%',
  maxWidth: 200,
});

const StackTraceContainer = styled(FlexColumn)({
  backgroundColor: colors.greyStackTraceTint,
  flexShrink: 0,
});

const UNKNOWN_CRASH_REASON = 'Cannot figure out the cause';

export function getNewPersisitedStateFromCrashLog(
  persistedState: ?PersistedState,
  persistingPlugin: Class<FlipperDevicePlugin<> | FlipperPlugin<>>,
  content: string,
  os: ?OS,
  logDate: ?Date,
): ?PersistedState {
  const persistedStateReducer = persistingPlugin.persistedStateReducer;
  if (!os || !persistedStateReducer) {
    return null;
  }
  const crash = parseCrashLog(content, os, logDate);
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
  logDate: ?Date,
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
    logDate,
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

export function parseCrashLog(
  content: string,
  os: OS,
  logDate: ?Date,
): CrashLog {
  const fallbackReason = UNKNOWN_CRASH_REASON;
  switch (os) {
    case 'iOS': {
      const regex = /Exception Type: *\w*/;
      const arr = regex.exec(content);
      const exceptionString = arr ? arr[0] : '';
      const exceptionRegex = /\w*$/;
      const tmp = exceptionRegex.exec(exceptionString);
      const exception = tmp && tmp[0].length ? tmp[0] : fallbackReason;

      let date = logDate;
      if (!date) {
        const dateRegex = /Date\/Time: *[\w\s\.:-]*/;
        const dateArr = dateRegex.exec(content);
        const dateString = dateArr ? dateArr[0] : '';
        const dateRegex2 = /[\w\s\.:-]*$/;
        const tmp1 = dateRegex2.exec(dateString);
        const extractedDateString: ?string =
          tmp1 && tmp1[0].length ? tmp1[0] : null;
        date = extractedDateString ? new Date(extractedDateString) : logDate;
      }

      const crash = {
        callstack: content,
        name: exception,
        reason: exception,
        date,
      };
      return crash;
    }
    case 'Android': {
      const regForName = /.*\n/;
      const nameRegArr = regForName.exec(content);
      let name = nameRegArr ? nameRegArr[0] : fallbackReason;
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
          : fallbackReason;
      if (name[name.length - 1] === '\n') {
        name = name.slice(0, -1);
      }
      const crash = {
        callstack: content,
        name: name,
        reason: reason,
        date: logDate,
      };
      return crash;
    }
    default: {
      throw new Error('Unsupported OS');
    }
  }
}

function truncate(baseString: string, numOfChars: number): string {
  if (baseString.length <= numOfChars) {
    return baseString;
  }
  const truncated_string = unicodeSubstring(baseString, 0, numOfChars - 1);
  return truncated_string + '\u2026';
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
    const filepath = path.join(dir, filename);
    promisify(fs.exists)(filepath).then((exists) => {
      if (!exists) {
        return;
      }
      fs.readFile(filepath, 'utf8', function (err, data) {
        if (store.getState().connections.selectedDevice?.os != 'iOS') {
          // If the selected device is not iOS don't show crash notifications
          return;
        }
        if (err) {
          console.error(err);
          return;
        }
        parseCrashLogAndUpdateState(
          store,
          util.format(data),
          setPersistedState,
        );
      });
    });
  });
}

class CrashSelector extends Component<CrashSelectorProps> {
  render() {
    const {crashes, selectedCrashID, orderedIDs, onCrashChange} = this.props;
    return (
      <StyledFlexRowColumn>
        <ButtonGroupContainer>
          <MatchParentHeightComponent>
            <Button
              disabled={Boolean(!orderedIDs || orderedIDs.length <= 1)}
              compact={true}
              onClick={() => {
                if (onCrashChange && orderedIDs) {
                  const index = orderedIDs.indexOf(selectedCrashID);
                  const nextIndex =
                    index < 1 ? orderedIDs.length - 1 : index - 1;
                  const nextID = orderedIDs[nextIndex];
                  onCrashChange(nextID);
                }
              }}
              icon="chevron-left"
              iconSize={12}
              title="Previous Crash"
            />
          </MatchParentHeightComponent>
          <MatchParentHeightComponent>
            <Button
              disabled={Boolean(!orderedIDs || orderedIDs.length <= 1)}
              compact={true}
              onClick={() => {
                if (onCrashChange && orderedIDs) {
                  const index = orderedIDs.indexOf(selectedCrashID);
                  const nextIndex =
                    index >= orderedIDs.length - 1 ? 0 : index + 1;
                  const nextID = orderedIDs[nextIndex];
                  onCrashChange(nextID);
                }
              }}
              icon="chevron-right"
              iconSize={12}
              title="Next Crash"
            />
          </MatchParentHeightComponent>
        </ButtonGroupContainer>
        <StyledSelectContainer>
          <StyledSelect
            grow={true}
            selected={selectedCrashID || 'NoCrashID'}
            options={crashes || {NoCrashID: 'No Crash'}}
            onChangeWithKey={(key: string) => {
              if (onCrashChange) {
                onCrashChange(key);
              }
            }}
          />
        </StyledSelectContainer>
      </StyledFlexRowColumn>
    );
  }
}

class CrashReporterBar extends Component<CrashReporterBarProps> {
  render() {
    const {openLogsCallback, crashSelector} = this.props;
    return (
      <Toolbar>
        <CrashSelector {...crashSelector} />
        <Spacer />
        <Button
          disabled={Boolean(!openLogsCallback)}
          onClick={openLogsCallback}>
          Open In Logs
        </Button>
      </Toolbar>
    );
  }
}

class HeaderRow extends Component<HeaderRowProps> {
  render() {
    const {title, value} = this.props;
    return (
      <Padder paddingTop={8} paddingBottom={2} paddingLeft={8}>
        <Container>
          <FlexRow>
            <Title>{title}</Title>
            <ContextMenu
              items={[
                {
                  label: 'copy',
                  click: () => {
                    clipboard.writeText(value);
                  },
                },
              ]}>
              <Value code={true}>{value}</Value>
            </ContextMenu>
          </FlexRow>
          <Line />
        </Container>
      </Padder>
    );
  }
}

type StackTraceComponentProps = {
  stacktrace: string,
};

class StackTraceComponent extends Component<StackTraceComponentProps> {
  render() {
    const {stacktrace} = this.props;
    return (
      <StackTraceContainer>
        <Padder paddingTop={8} paddingBottom={2} paddingLeft={8}>
          <Value code={true}>{stacktrace}</Value>
        </Padder>
        <Line />
      </StackTraceContainer>
    );
  }
}

export default class CrashReporterPlugin extends FlipperDevicePlugin<
  State,
  void,
  PersistedState,
> {
  static defaultPersistedState = {crashes: []};

  static supportsDevice(device: Device) {
    return (
      (device.os === 'iOS' && device.deviceType !== 'physical') ||
      device.os === 'Android'
    );
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
            date: payload.date || new Date(),
          },
        ]),
      };
      return mergedState;
    }
    return persistedState;
  };

  static trimCallStackIfPossible = (callstack: string): string => {
    const regex = /Application Specific Information:/;
    const query = regex.exec(callstack);
    return query ? callstack.substring(0, query.index) : callstack;
  };
  /*
   * Callback to provide the currently active notifications.
   */
  static getActiveNotifications = (
    persistedState: PersistedState,
  ): Array<Notification> => {
    const filteredCrashes = persistedState.crashes.filter((crash) => {
      const ignore = !crash.name && !crash.reason;
      const unknownCrashCause = crash.reason === UNKNOWN_CRASH_REASON;
      if (ignore || unknownCrashCause) {
        console.error('Ignored the notification for the crash', crash);
      }
      return !ignore && !unknownCrashCause;
    });
    return filteredCrashes.map((crash: Crash) => {
      const id = crash.notificationID;
      const name: string = crash.name || crash.reason;
      let title: string = 'CRASH: ' + truncate(name, 50);
      title = `${
        name == crash.reason
          ? title
          : title + 'Reason: ' + truncate(crash.reason, 50)
      }`;
      const callstack = crash.callstack
        ? CrashReporterPlugin.trimCallStackIfPossible(crash.callstack)
        : 'No callstack available';
      const msg = `Callstack: ${truncate(callstack, 200)}`;
      return {
        id,
        message: msg,
        severity: 'error',
        title: title,
        action: id,
        category: crash.reason || 'Unknown reason',
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
      (function (
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
                  entry.date,
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

  constructor(props: Props<PersistedState>) {
    // Required step: always call the parent class' constructor
    super(props);
    let crash: ?Crash = null;
    if (
      this.props.persistedState.crashes &&
      this.props.persistedState.crashes.length > 0
    ) {
      crash = this.props.persistedState.crashes[
        this.props.persistedState.crashes.length - 1
      ];
    }

    let deeplinkedCrash = null;
    if (this.props.deepLinkPayload) {
      const id = this.props.deepLinkPayload;
      const index = this.props.persistedState.crashes.findIndex((elem) => {
        return elem.notificationID === id;
      });
      if (index >= 0) {
        deeplinkedCrash = this.props.persistedState.crashes[index];
      }
    }
    // Set the state directly. Use props if necessary.
    this.state = {
      crash: deeplinkedCrash || crash,
    };
  }

  render() {
    let crashToBeInspected = this.state.crash;

    if (!crashToBeInspected && this.props.persistedState.crashes.length > 0) {
      crashToBeInspected = this.props.persistedState.crashes[
        this.props.persistedState.crashes.length - 1
      ];
    }
    const crash = crashToBeInspected;
    if (crash) {
      const {crashes} = this.props.persistedState;
      const crashMap = crashes.reduce(
        (acc: {[key: string]: string}, persistedCrash: Crash) => {
          const {notificationID, date} = persistedCrash;
          const name = 'Crash at ' + date.toLocaleString();
          acc[notificationID] = name;
          return acc;
        },
        {},
      );

      const orderedIDs = crashes.map(
        (persistedCrash) => persistedCrash.notificationID,
      );
      const selectedCrashID = crash.notificationID;
      const onCrashChange = (id) => {
        const newSelectedCrash = crashes.find(
          (element) => element.notificationID === id,
        );
        this.setState({crash: newSelectedCrash});
      };

      const callstackString = crash.callstack || '';
      const children = callstackString.split('\n').map((str) => {
        return {message: str};
      });
      const crashSelector: CrashSelectorProps = {
        crashes: crashMap,
        orderedIDs,
        selectedCrashID,
        onCrashChange,
      };
      const showReason = crash.reason !== UNKNOWN_CRASH_REASON;
      return (
        <PluginRootContainer>
          {this.device.os == 'Android' ? (
            <CrashReporterBar
              crashSelector={crashSelector}
              openLogsCallback={() => {
                if (crash.callstack) {
                  this.openInLogs(crash.callstack);
                }
              }}
            />
          ) : (
            <CrashReporterBar crashSelector={crashSelector} />
          )}
          <ScrollableColumn>
            <HeaderRow title="Name" value={crash.name} />
            {showReason ? (
              <HeaderRow title="Reason" value={crash.reason} />
            ) : null}
            <Padder paddingLeft={8} paddingTop={4} paddingBottom={2}>
              <Title> Stacktrace </Title>
            </Padder>
            <ContextMenu
              items={[
                {
                  label: 'copy',
                  click: () => {
                    clipboard.writeText(callstackString);
                  },
                },
              ]}>
              <Line />
              {children.map((child) => {
                return (
                  <StackTraceComponent
                    key={child.message}
                    stacktrace={child.message}
                  />
                );
              })}
            </ContextMenu>
          </ScrollableColumn>
        </PluginRootContainer>
      );
    }
    const crashSelector = {
      crashes: null,
      orderedIDs: null,
      selectedCrashID: null,
      onCrashChange: null,
    };
    return (
      <StyledFlexGrowColumn>
        <CrashReporterBar crashSelector={crashSelector} />
        <StyledFlexColumn>
          <Padder paddingBottom={8}>
            <Title>No Crashes Logged</Title>
          </Padder>
        </StyledFlexColumn>
      </StyledFlexGrowColumn>
    );
  }
}
