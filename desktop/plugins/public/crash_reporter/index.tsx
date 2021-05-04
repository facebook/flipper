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
  Text,
  colors,
  Toolbar,
  Spacer,
  Select,
} from 'flipper';
import React from 'react';
import {
  createState,
  DeviceLogEntry,
  DevicePluginClient,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import type {FSWatcher} from 'fs';
import {
  parseCrashLog,
  trimCallStackIfPossible,
  truncate,
  UNKNOWN_CRASH_REASON,
} from './crash-utils';
import {addFileWatcherForiOSCrashLogs} from './ios-crash-utils';
import {shouldParseAndroidLog} from './android-crash-utils';

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
                if (orderedIDs && selectedCrashID) {
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
                if (orderedIDs && selectedCrashID) {
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
