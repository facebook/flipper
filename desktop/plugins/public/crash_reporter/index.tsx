/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  View,
  styled,
  FlexColumn,
  FlexRow,
  ContextMenu,
  clipboard,
  Button,
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
import path from 'path';
import {promisify} from 'util';
import type {DeviceLogEntry} from 'flipper';
import React from 'react';
import {
  createState,
  DevicePluginClient,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import type {FSWatcher} from 'fs';

type Maybe<T> = T | null | undefined;

type HeaderRowProps = {
  title: string;
  value: string;
};
type openLogsCallbackType = () => void;

type CrashReporterBarProps = {
  openLogsCallback?: openLogsCallbackType;
  crashSelector: CrashSelectorProps;
};

type CrashSelectorProps = {
  crashes?: {[key: string]: string};
  orderedIDs?: Array<string>;
  selectedCrashID?: string;
  onCrashChange: (name: Maybe<string>) => void;
};

export type Crash = {
  notificationID: string;
  callstack?: string;
  reason: string;
  name: string;
  date: Date;
};

export type CrashLog = {
  callstack: string;
  reason: string;
  name: string;
  date: Maybe<Date>;
};

const Padder = styled.div<{
  paddingLeft?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingTop?: number;
}>(({paddingLeft, paddingRight, paddingBottom, paddingTop}) => ({
  paddingLeft: paddingLeft || 0,
  paddingRight: paddingRight || 0,
  paddingBottom: paddingBottom || 0,
  paddingTop: paddingTop || 0,
}));

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

export function parseCrashLog(
  content: string,
  os: string,
  logDate: Maybe<Date>,
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
        const extractedDateString: Maybe<string> =
          tmp1 && tmp1[0].length ? tmp1[0] : null;
        date = extractedDateString ? new Date(extractedDateString) : logDate;
      }

      const crash: CrashLog = {
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
      const regForCallStack = /\tat[\w\s\n\.$&+,:;=?@#|'<>.^*()%!-]*$/;
      const callStackArray = regForCallStack.exec(content);
      const callStack = callStackArray ? callStackArray[0] : '';
      let remainingString =
        callStack.length > 0 ? content.replace(callStack, '') : '';
      if (remainingString[remainingString.length - 1] === '\n') {
        remainingString = remainingString.slice(0, -1);
      }
      const reasonText =
        remainingString.length > 0
          ? remainingString.split('\n').pop()
          : fallbackReason;
      const reason = reasonText ? reasonText : fallbackReason;
      if (name[name.length - 1] === '\n') {
        name = name.slice(0, -1);
      }
      const crash: CrashLog = {
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

export function parsePath(content: string): Maybe<string> {
  const regex = /(?<=.*Path: *)[^\n]*/;
  const arr = regex.exec(content);
  if (!arr || arr.length <= 0) {
    return null;
  }
  const path = arr[0];
  return path.trim();
}

function addFileWatcherForiOSCrashLogs(
  deviceOs: string,
  serial: string,
  reportCrash: (payload: CrashLog | Crash) => void,
) {
  const dir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');
  if (!fs.existsSync(dir)) {
    // Directory doesn't exist
    return;
  }
  return fs.watch(dir, (_eventType, filename) => {
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
        if (err) {
          console.warn('Failed to read crash file', err);
          return;
        }
        if (shouldShowiOSCrashNotification(serial, data)) {
          reportCrash(parseCrashLog(data, deviceOs, null));
        }
      });
    });
  });
}

class CrashSelector extends React.Component<CrashSelectorProps> {
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
                if (onCrashChange && orderedIDs && selectedCrashID) {
                  const index = orderedIDs.indexOf(selectedCrashID as string);
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
                if (onCrashChange && orderedIDs && selectedCrashID) {
                  const index = orderedIDs.indexOf(selectedCrashID as string);
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

class CrashReporterBar extends React.Component<CrashReporterBarProps> {
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

class HeaderRow extends React.Component<HeaderRowProps> {
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
  stacktrace: string;
};

class StackTraceComponent extends React.Component<StackTraceComponentProps> {
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

export function devicePlugin(client: DevicePluginClient) {
  let notificationID = -1;
  let watcher: FSWatcher | undefined;

  const crashes = createState<Crash[]>([], {persist: 'crashes'});
  const selectedCrash = createState<string | undefined>();

  client.onDeepLink((crashId) => {
    selectedCrash.set(crashId as string);
  });

  function reportCrash(payload: CrashLog | Crash) {
    notificationID++;

    const crash = {
      notificationID: notificationID.toString(),
      callstack: payload.callstack,
      name: payload.name,
      reason: payload.reason,
      date: payload.date || new Date(),
    };

    crashes.update((draft) => {
      draft.push(crash);
    });

    // show notification?
    const ignore = !crash.name && !crash.reason;
    const unknownCrashCause = crash.reason === UNKNOWN_CRASH_REASON;
    if (ignore || unknownCrashCause) {
      console.warn('Ignored the notification for the crash', crash);
      return;
    }

    let title: string = 'CRASH: ' + truncate(crash.name || crash.reason, 50);
    title = `${
      crash.name == crash.reason
        ? title
        : title + 'Reason: ' + truncate(crash.reason, 50)
    }`;
    const callstack = crash.callstack
      ? trimCallStackIfPossible(crash.callstack)
      : 'No callstack available';
    const msg = `Callstack: ${truncate(callstack, 200)}`;
    client.showNotification({
      id: crash.notificationID,
      message: msg,
      severity: 'error',
      title: title,
      action: crash.notificationID,
      category: crash.reason || 'Unknown reason',
    });
  }

  // Startup logic to establish log monitoring
  if (client.device.isConnected) {
    if (client.device.os.includes('iOS')) {
      watcher = addFileWatcherForiOSCrashLogs(
        client.device.os,
        client.device.serial,
        reportCrash,
      );
    } else {
      const referenceDate = new Date();
      let androidLog: string = '';
      let androidLogUnderProcess = false;
      let timer: Maybe<NodeJS.Timeout> = null;
      client.device.onLogEntry((entry: DeviceLogEntry) => {
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
              reportCrash(
                parseCrashLog(androidLog, client.device.os, entry.date),
              );
            }
            androidLogUnderProcess = false;
            androidLog = '';
          }, 50);
        }
      });
    }
  }

  client.onDestroy(() => {
    watcher?.close();
  });

  return {
    reportCrash,
    crashes,
    selectedCrash,
    openInLogs(callstack: string) {
      client.selectPlugin('DeviceLogs', callstack);
    },
    os: client.device.os,
    copyCrashToClipboard(callstack: string) {
      client.writeTextToClipboard(callstack);
    },
  };
}

export function Component() {
  const plugin = usePlugin(devicePlugin);
  const selectedCrash = useValue(plugin.selectedCrash);
  const crashes = useValue(plugin.crashes);
  const crash =
    crashes.find((c) => c.notificationID === selectedCrash) ??
    crashes[crashes.length - 1] ??
    undefined;

  if (crash) {
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
    const onCrashChange = (id: Maybe<string>) => {
      if (id) {
        plugin.selectedCrash.set(id);
      }
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
        {plugin.os == 'Android' ? (
          <CrashReporterBar
            crashSelector={crashSelector}
            openLogsCallback={() => {
              if (crash.callstack) {
                plugin.openInLogs(crash.callstack);
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
                  plugin.copyCrashToClipboard(callstackString);
                },
              },
            ]}>
            <Line />
            {children.map((child, index) => {
              return (
                <StackTraceComponent key={index} stacktrace={child.message} />
              );
            })}
          </ContextMenu>
        </ScrollableColumn>
      </PluginRootContainer>
    );
  }
  const crashSelector = {
    crashes: undefined,
    orderedIDs: undefined,
    selectedCrashID: undefined,
    onCrashChange: () => void {},
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

function trimCallStackIfPossible(callstack: string): string {
  const regex = /Application Specific Information:/;
  const query = regex.exec(callstack);
  return query ? callstack.substring(0, query.index) : callstack;
}

export function shouldShowiOSCrashNotification(
  serial: string,
  content: string,
): boolean {
  const appPath = parsePath(content);
  if (!appPath || !appPath.includes(serial)) {
    // Do not show notifications for the app which are not running on this device
    return false;
  }
  return true;
}
