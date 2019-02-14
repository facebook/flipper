/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component, Button, styled} from 'flipper';
import {connect} from 'react-redux';
import {spawn} from 'child_process';
import {dirname} from 'path';
import {selectDevice, preferDevice} from '../reducers/connections.js';
import {default as which} from 'which';
import {promisify} from 'util';
import type BaseDevice from '../devices/BaseDevice.js';

const whichPromise = promisify(which);

type Props = {
  selectedDevice: ?BaseDevice,
  androidEmulators: Array<string>,
  devices: Array<BaseDevice>,
  selectDevice: (device: BaseDevice) => void,
  preferDevice: (device: string) => void,
};

const DropdownButton = styled(Button)({
  fontSize: 11,
});

class DevicesButton extends Component<Props> {
  launchEmulator = (name: string) => {
    // On Linux, you must run the emulator from the directory it's in because
    // reasons ...
    whichPromise('emulator')
      .then(emulatorPath => {
        const child = spawn(emulatorPath, [`@${name}`], {
          detached: true,
          cwd: dirname(emulatorPath),
        });
        child.stderr.on('data', data => {
          console.error(`Android emulator error: ${data}`);
        });
        child.on('error', console.error);
      })
      .catch(console.error);
    this.props.preferDevice(name);
  };

  render() {
    const {
      devices,
      androidEmulators,
      selectedDevice,
      selectDevice,
    } = this.props;
    let text = 'No device selected';
    let icon = 'minus-circle';

    if (selectedDevice) {
      text = selectedDevice.title;
      icon = 'mobile';
    }

    const dropdown = [];

    if (devices.length > 0) {
      dropdown.push(
        {
          label: 'Running devices',
          enabled: false,
        },
        ...devices.map((device: BaseDevice) => {
          let label = '';
          switch (device.deviceType) {
            case 'emulator':
              label = '';
              break;
            case 'physical':
              label = '📱 ';
              break;
            case 'archivedEmulator':
              label = '📦 ';
              break;
            case 'archivedPhysical':
              label = '📦 ';
              break;
            default:
              label = '';
          }
          return {
            click: () => selectDevice(device),
            checked: device === selectedDevice,
            label: `${label}${device.title}`,
            type: 'checkbox',
          };
        }),
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
      <DropdownButton compact={true} icon={icon} dropdown={dropdown}>
        {text}
      </DropdownButton>
    );
  }
}
export default connect<Props, {||}, _, _, _, _>(
  ({connections: {devices, androidEmulators, selectedDevice}}) => ({
    devices,
    androidEmulators,
    selectedDevice,
  }),
  {
    selectDevice,
    preferDevice,
  },
)(DevicesButton);
