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

type Crash = {|
  notificationID: number,
  callStack: [string],
  reason: string,
  name: string,
|};
type PersistedState = {|
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
});

const RootColumn = styled(FlexColumn)({
  paddingLeft: '16px',
  paddingRight: '16px',
  paddingTop: '8px',
});

const CrashRow = styled(FlexRow)({
  paddingTop: '8px',
});

const CallStack = styled('pre')({
  fontFamily: 'Monospace',
  fontSize: '100%',
  paddingLeft: '8px',
});

export default class CrashReporterPlugin extends FlipperDevicePlugin {
  static title = 'Crash Reporter';
  static id = 'CrashReporter';
  static icon = 'apps';

  static defaultPersistedState = {
    crashes: [],
  };

  static supportsDevice(device: Device) {
    return device.os === 'iOS' || device.os === 'Android';
  }
  /*
   * Reducer to process incoming "send" messages from the mobile counterpart.
   */
  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: Object,
  ): PersistedState => {
    if (method === 'crash-report') {
      return {
        ...persistedState,
        crashes: persistedState.crashes.concat([
          {
            notificationID: Math.random(), // All notifications are unique
            callStack: payload.callstack,
            name: payload.name,
            reason: payload.reason,
          },
        ]),
      };
    }
    return persistedState;
  };

  /*
   * Callback to provide the currently active notifications.
   */
  static getActiveNotifications = (
    persistedState: PersistedState,
  ): Array<Notification> => {
    return persistedState.crashes.map((crash: Crash) => {
      return {
        id: 'crash-notification:' + crash.notificationID,
        message: crash.callStack,
        severity: 'error',
        title: 'CRASH: ' + crash.name + ' ' + crash.reason,
        action: 'Inspect',
      };
    });
  };

  convertCallstackToString(crash: Crash): string {
    return crash.callStack.reduce((acc, val) => acc.concat('\n', val));
  }

  render() {
    if (this.props.persistedState.crashes.length > 0) {
      const crash = this.props.persistedState.crashes.slice(-1)[0];
      const callStackString = this.convertCallstackToString(crash);
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
                    clipboard.writeText(callStackString);
                  },
                },
              ]}>
              <CallStack>{callStackString}</CallStack>
            </ContextMenu>
          </CrashRow>
          {this.device.os == 'Android' && (
            <CrashRow>
              <Button
                onClick={event => {
                  this.props.selectPlugin(
                    'DeviceLogs',
                    JSON.stringify({
                      ...crash,
                      callStackString: callStackString,
                    }),
                  );
                }}>
                Deeplink to Logs
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
