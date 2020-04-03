/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, styled} from 'flipper';
import {connect, ReactReduxContext} from 'react-redux';
import {spawn} from 'child_process';
import {dirname} from 'path';
import {selectDevice, preferDevice} from '../reducers/connections';
import {
  setActiveSheet,
  ActiveSheet,
  ACTIVE_SHEET_JS_EMULATOR_LAUNCHER,
} from '../reducers/application';
import which from 'which';
import {showOpenDialog} from '../utils/exportData';
import BaseDevice from '../devices/BaseDevice';
import React, {Component} from 'react';
import {State} from '../reducers';
import GK from '../fb-stubs/GK';

type StateFromProps = {
  selectedDevice: BaseDevice | null | undefined;
  androidEmulators: Array<string>;
  devices: Array<BaseDevice>;
};

type DispatchFromProps = {
  selectDevice: (device: BaseDevice) => void;
  preferDevice: (device: string) => void;
  setActiveSheet: (sheet: ActiveSheet) => void;
};

type OwnProps = {};

type Props = OwnProps & StateFromProps & DispatchFromProps;
const DropdownButton = styled(Button)({
  fontSize: 11,
});

class DevicesButton extends Component<Props> {
  launchEmulator = (name: string) => {
    // On Linux, you must run the emulator from the directory it's in because
    // reasons ...
    which('emulator')
      .then((emulatorPath) => {
        if (emulatorPath) {
          const child = spawn(emulatorPath, [`@${name}`], {
            detached: true,
            cwd: dirname(emulatorPath),
          });
          child.stderr.on('data', (data) => {
            console.error(`Android emulator error: ${data}`);
          });
          child.on('error', console.error);
        } else {
          throw new Error('Could not get emulator path');
        }
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

    if (selectedDevice && selectedDevice.isArchived) {
      buttonLabel = `${selectedDevice.displayTitle() || 'Unknown device'}`;
      icon = 'box';
    } else if (selectedDevice && selectedDevice.deviceType === 'physical') {
      buttonLabel = selectedDevice.displayTitle() || 'Unknown device';
      icon = 'mobile';
    } else if (selectedDevice && selectedDevice.deviceType === 'emulator') {
      buttonLabel = selectedDevice.displayTitle() || 'Unknown emulator';
      icon = 'desktop';
    }

    const dropdown: any[] = [];

    // Physical devices
    const connectedDevices = [
      {
        label: 'Connected Devices',
        enabled: false,
      },
      ...devices
        .filter((device) => device.deviceType === 'physical')
        .map((device: BaseDevice) => ({
          click: () => selectDevice(device),
          checked: device === selectedDevice,
          label: `📱 ${device.displayTitle()}`,
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
        .filter((device) => device.deviceType === 'emulator')
        .map((device: BaseDevice) => ({
          click: () => selectDevice(device),
          checked: device === selectedDevice,
          label: device.displayTitle(),
          type: 'checkbox',
        })),
    ];
    if (runningEmulators.length > 1) {
      dropdown.push(...runningEmulators);
    }
    // Archived
    const importedFiles = [
      {
        label: 'Disconnected Devices',
        enabled: false,
      },
      ...devices
        .filter((device) => device.isArchived)
        .map((device: BaseDevice) => ({
          click: () => selectDevice(device),
          checked: device === selectedDevice,
          label: `📦 ${device.displayTitle()}`,
          type: 'checkbox',
        })),
    ];
    if (importedFiles.length > 1) {
      dropdown.push(...importedFiles);
    }
    // Launch JS emulator
    if (GK.get('flipper_js_client_emulator')) {
      dropdown.push(
        {type: 'separator' as 'separator'},
        {
          label: 'Launch JS Web App',
          click: () =>
            this.props.setActiveSheet(ACTIVE_SHEET_JS_EMULATOR_LAUNCHER),
        },
      );
    }
    // Launch Android emulators
    if (androidEmulators.length > 0) {
      const emulators = Array.from(androidEmulators)
        .filter(
          (name: string) =>
            devices.findIndex(
              (device: BaseDevice) =>
                device.title === name && !device.isArchived,
            ) === -1,
        )
        .map((name: string) => ({
          label: name,
          click: () => this.launchEmulator(name),
        }));

      if (emulators.length > 0) {
        dropdown.push(
          {type: 'separator' as 'separator'},
          {
            label: 'Launch Android emulators',
            enabled: false,
          },
          ...emulators,
        );
      }
    }

    if (dropdown.length > 0) {
      dropdown.push({type: 'separator' as 'separator'});
    }
    return (
      <ReactReduxContext.Consumer>
        {({store}) => {
          dropdown.push({
            label: 'Open File...',
            click: () => {
              showOpenDialog(store);
            },
          });
          return (
            <DropdownButton compact={true} icon={icon} dropdown={dropdown}>
              {buttonLabel}
            </DropdownButton>
          );
        }}
      </ReactReduxContext.Consumer>
    );
  }
}
export default connect<StateFromProps, DispatchFromProps, OwnProps, State>(
  ({connections: {devices, androidEmulators, selectedDevice}}) => ({
    devices,
    androidEmulators,
    selectedDevice,
  }),
  {
    selectDevice,
    preferDevice,
    setActiveSheet,
  },
)(DevicesButton);
