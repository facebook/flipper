/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component, Button} from 'sonar';
import {connect} from 'react-redux';
import {exec} from 'child_process';
import {selectDevice} from '../reducers/connections.js';
import type BaseDevice from '../devices/BaseDevice.js';

type Props = {
  selectedDeviceIndex: number,
  androidEmulators: Array<string>,
  devices: Array<BaseDevice>,
  selectDevice: (i: number) => void,
};

class DevicesButton extends Component<Props> {
  launchEmulator = (name: string) => {
    exec(`$ANDROID_HOME/tools/emulator @${name}`, error => {
      if (error) {
        console.error(error);
      }
    });
  };

  render() {
    const {
      devices,
      androidEmulators,
      selectedDeviceIndex,
      selectDevice,
    } = this.props;
    let text = 'No device selected';
    let icon = 'minus-circle';

    if (selectedDeviceIndex > -1) {
      text = devices[selectedDeviceIndex].title;
      icon = 'mobile';
    }

    const dropdown = [];

    if (devices.length > 0) {
      dropdown.push(
        {
          label: 'Running devices',
          enabled: false,
        },
        ...devices.map((device: BaseDevice, i: number) => ({
          click: () => selectDevice(i),
          checked: i === selectedDeviceIndex,
          label: `${device.deviceType === 'physical' ? '📱 ' : ''}${
            device.title
          }`,
          type: 'checkbox',
        })),
      );
    }
    if (androidEmulators.length > 0) {
      const emulators = Array.from(androidEmulators)
        .filter(
          (name: string) =>
            devices.findIndex((device: BaseDevice) => device.title === name) ===
            -1,
        )
        .map((name: string) => ({
          label: name,
          click: () => this.launchEmulator(name),
        }));

      if (emulators.length > 0) {
        dropdown.push(
          {type: 'separator'},
          {
            label: 'Launch Android emulators',
            enabled: false,
          },
          ...emulators,
        );
      }
    }
    return (
      <Button compact={true} icon={icon} dropdown={dropdown} disabled={false}>
        {text}
      </Button>
    );
  }
}
export default connect(
  ({connections: {devices, androidEmulators, selectedDeviceIndex}}) => ({
    devices,
    androidEmulators,
    selectedDeviceIndex,
  }),
  {selectDevice},
)(DevicesButton);
