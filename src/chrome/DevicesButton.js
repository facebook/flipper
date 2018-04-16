/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Devices} from '../init.js';

import {Component, styled, Glyph, Button, colors} from 'sonar';
import BaseDevice from '../devices/BaseDevice.js';
import child_process from 'child_process';
import DevicesList from './DevicesList.js';

const adb = require('adbkit-fb');

const Light = styled.view(
  {
    width: 10,
    height: 10,
    borderRadius: '999em',
    backgroundColor: props => (props.active ? '#70f754' : colors.light20),
    border: props => `1px solid ${props.active ? '#52d936' : colors.light30}`,
  },
  {
    ignoreAttributes: ['active'],
  },
);

type Props = {|
  devices: Devices,
|};

type Emulator = {|
  name: string,
  os?: string,
  isRunning: boolean,
|};

type State = {
  androidEmulators: Array<Emulator>,
  iOSSimulators: Array<Emulator>,
  popoverVisible: boolean,
};

type IOSSimulatorList = {
  devices: {
    [os: string]: Array<{
      state: 'Shutdown' | 'Booted',
      availability: string,
      name: string,
      udid: string,
      os?: string,
    }>,
  },
};

export default class DEvicesButton extends Component<Props, State> {
  state = {
    androidEmulators: [],
    iOSSimulators: [],
    popoverVisible: false,
  };

  client = adb.createClient();
  _iOSSimulatorRefreshInterval: ?number;

  componentDidMount() {
    this.updateEmulatorState(this.openMenuWhenNoDevicesConnected);
    this.fetchIOSSimulators();
    this._iOSSimulatorRefreshInterval = window.setInterval(
      this.fetchIOSSimulators,
      5000,
    );

    this.client.trackDevices().then(tracker => {
      tracker.on('add', () => this.updateEmulatorState());
      tracker.on('remove', () => this.updateEmulatorState());
      tracker.on('end', () => this.updateEmulatorState());
    });
  }

  componentWillUnmount() {
    if (this._iOSSimulatorRefreshInterval != null) {
      window.clearInterval(this._iOSSimulatorRefreshInterval);
    }
  }

  fetchIOSSimulators = () => {
    child_process.exec(
      'xcrun simctl list devices --json',
      (err: ?Error, data: ?string) => {
        if (data != null && err == null) {
          const devicesList: IOSSimulatorList = JSON.parse(data);
          const iOSSimulators = Object.keys(devicesList.devices)
            .map(os =>
              devicesList.devices[os].map(device => {
                device.os = os;
                return device;
              }),
            )
            .reduce((acc, cv) => acc.concat(cv), [])
            .filter(device => device.state === 'Booted')
            .map(device => ({
              name: device.name,
              os: device.os,
              isRunning: true,
            }));
          this.setState({iOSSimulators});
        }
      },
    );
  };

  openMenuWhenNoDevicesConnected = () => {
    const numberOfEmulators = this.state.androidEmulators.filter(
      e => e.isRunning,
    ).length;
    const numberOfDevices = Object.values(this.props.devices).length;
    if (numberOfEmulators + numberOfDevices === 0) {
      this.setState({popoverVisible: true});
    }
  };

  updateEmulatorState = async (cb?: Function) => {
    try {
      const devices = await this.getEmulatorNames();
      const ports = await this.getRunningEmulatorPorts();
      const runningDevices = await Promise.all(
        ports.map(port => this.getRunningName(port)),
      );
      this.setState(
        {
          androidEmulators: devices.map(name => ({
            name,
            isRunning: runningDevices.indexOf(name) > -1,
          })),
        },
        cb,
      );
    } catch (e) {
      console.error(e);
    }
  };

  getEmulatorNames(): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
      child_process.exec(
        '/opt/android_sdk/tools/emulator -list-avds',
        (error: ?Error, data: ?string) => {
          if (error == null && data != null) {
            resolve(data.split('\n').filter(name => name !== ''));
          } else {
            reject(error);
          }
        },
      );
    });
  }

  getRunningEmulatorPorts(): Promise<Array<string>> {
    const EMULATOR_PREFIX = 'emulator-';
    return adb
      .createClient()
      .listDevices()
      .then((devices: Array<{id: string}>) =>
        devices
          .filter(d => d.id.startsWith(EMULATOR_PREFIX))
          .map(d => d.id.replace(EMULATOR_PREFIX, '')),
      )
      .catch((e: Error) => {
        return [];
      });
  }

  getRunningName(port: string): Promise<?string> {
    return new Promise((resolve, reject) => {
      child_process.exec(
        `echo "avd name" | nc -w 1 localhost ${port}`,
        (error: ?Error, data: ?string) => {
          if (error == null && data != null) {
            const match = data.trim().match(/(.*)\r\nOK$/);
            resolve(match != null && match.length > 0 ? match[1] : null);
          } else {
            reject(error);
          }
        },
      );
    });
  }

  launchEmulator = (name: string) => {
    child_process.exec(
      `/opt/android_sdk/tools/emulator @${name}`,
      this.updateEmulatorState,
    );
  };

  createEmualtor = () => {};

  onClick = () => {
    this.setState({popoverVisible: !this.state.popoverVisible});
    this.updateEmulatorState();
    this.fetchIOSSimulators();
  };

  onDismissPopover = () => {
    this.setState({popoverVisible: false});
  };

  render() {
    let text = 'No devices running';
    let glyph = 'minus-circle';

    const runnningEmulators = this.state.androidEmulators.filter(
      emulator => emulator.isRunning,
    );

    const numberOfRunningDevices =
      runnningEmulators.length + this.state.iOSSimulators.length;

    if (numberOfRunningDevices > 0) {
      text = `${numberOfRunningDevices} device${
        numberOfRunningDevices > 1 ? 's' : ''
      } running`;
      glyph = 'mobile';
    }

    // $FlowFixMe
    const connectedDevices: Array<BaseDevice> = Object.values(
      this.props.devices,
    );

    return (
      <Button
        compact={true}
        onClick={this.onClick}
        icon={glyph}
        disabled={this.state.androidEmulators.length === 0}>
        {text}
        {this.state.popoverVisible && (
          <DevicesList
            onDismiss={this.onDismissPopover}
            sections={[
              {
                title: 'Running',
                items: [
                  ...connectedDevices
                    .filter(device => device.deviceType === 'physical')
                    .map(device => ({
                      title: device.title,
                      subtitle: device.os,
                      icon: <Light active={true} />,
                    })),
                  ...runnningEmulators.map(emulator => ({
                    title: emulator.name,
                    subtitle: 'Android Emulator',
                    icon: <Light active={true} />,
                  })),
                  ...this.state.iOSSimulators.map(simulator => ({
                    title: simulator.name,
                    subtitle: `${String(simulator.os)} Simulator`,
                    icon: <Light active={true} />,
                  })),
                ],
              },
              {
                title: 'Not Running',
                items: [
                  ...this.state.androidEmulators
                    .filter(emulator => !emulator.isRunning)
                    .map(emulator => ({
                      title: emulator.name,
                      subtitle: 'Android Emulator',
                      onClick: () => this.launchEmulator(emulator.name),
                      icon: <Light active={false} />,
                    })),
                  {
                    title: 'Connect a device',
                    subtitle: 'Plugins will load automatically',
                    icon: <Glyph name="mobile" size={12} />,
                  },
                ],
              },
            ]}
          />
        )}
      </Button>
    );
  }
}
