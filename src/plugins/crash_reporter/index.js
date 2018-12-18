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
} from 'flipper';
import type {Notification} from '../../plugin';

export type Crash = {|
  notificationID: string,
  callstack: string,
  reason: string,
  name: string,
|};

export type PersistedState = {|
  crashes: Array<Crash>,
|};

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

export default class CrashReporterPlugin extends FlipperDevicePlugin {
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
    if (method === 'crash-report') {
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

  openInLogs = (callstack: string) => {
    this.props.selectPlugin('DeviceLogs', callstack);
  };

  render() {
    const crash =
      this.props.persistedState.crashes.length > 0 &&
      this.props.persistedState.crashes[
        this.props.persistedState.crashes.length - 1
      ];

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
              <Button onClick={() => this.openInLogs(crash.callstack)}>
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
