/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component, Button, styled} from 'flipper';
import ArchivedDevice from '../devices/ArchivedDevice.js';
import {connect} from 'react-redux';
import {spawn} from 'child_process';
import {dirname} from 'path';
import {selectDevice, preferDevice} from '../reducers/connections.js';
import {default as which} from 'which';
import {promisify} from 'util';
import {showOpenDialog} from '../utils/exportData';
import PropTypes from 'prop-types';
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
  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

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
    let buttonLabel = 'No device selected';
    let icon = 'minus-circle';

    if (selectedDevice instanceof ArchivedDevice) {
      buttonLabel = `${selectedDevice?.title || 'Unknown device'} (offline)`;
      icon = 'box';
    } else if (selectedDevice?.deviceType === 'physical') {
      buttonLabel = selectedDevice?.title || 'Unknown device';
      icon = 'mobile';
    } else if (selectedDevice?.deviceType === 'emulator') {
      buttonLabel = selectedDevice?.title || 'Unknown emulator';
      icon = 'desktop';
    }

    const dropdown = [];

    // Physical devices
    const connectedDevices = [
      {
        label: 'Connected Devices',
        enabled: false,
      },
      ...devices
        .filter(device => device.deviceType === 'physical')
        .map((device: BaseDevice) => ({
          click: () => selectDevice(device),
          checked: device === selectedDevice,
          label: `📱 ${device.title}`,
          type: 'checkbox',
        })),
    ];
    if (connectedDevices.length > 1) {
      dropdown.push(...connectedDevices);
    }
    // Emulators
    const runningEmulators = [
      {
        label: 'Running Emulators',
        enabled: false,
      },
      ...devices
        .filter(device => device.deviceType === 'emulator')
        .map((device: BaseDevice) => ({
          click: () => selectDevice(device),
          checked: device === selectedDevice,
          label: device.title,
          type: 'checkbox',
        })),
    ];
    if (runningEmulators.length > 1) {
      dropdown.push(...runningEmulators);
    }
    // Archived
    const importedFiles = [
      {
        label: 'Imported Devices',
        enabled: false,
      },
      ...devices
        .filter(device => device instanceof ArchivedDevice)
        .map((device: BaseDevice) => ({
          click: () => selectDevice(device),
          checked: device === selectedDevice,
          label: `📦 ${device.title} (offline)`,
          type: 'checkbox',
        })),
    ];
    if (importedFiles.length > 1) {
      dropdown.push(...importedFiles);
    }
    // Launch Android emulators
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
    if (dropdown.length > 0) {
      dropdown.push({type: 'separator'});
    }
    dropdown.push({
      label: 'Open File...',
      click: () => {
        showOpenDialog(this.context.store);
      },
    });
    return (
      <DropdownButton compact={true} icon={icon} dropdown={dropdown}>
        {buttonLabel}
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
