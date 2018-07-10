/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type BaseDevice from '../devices/BaseDevice';
export type State = {
  devices: Array<BaseDevice>,
  androidEmulators: Array<string>,
  selectedDevice: ?BaseDevice,
  selectedPlugin: ?string,
  selectedApp: ?string,
};

export type Action =
  | {
      type: 'UNREGISTER_DEVICES',
      payload: Set<string>,
    }
  | {
      type: 'REGISTER_DEVICE',
      payload: BaseDevice,
    }
  | {
      type: 'REGISTER_ANDROID_EMULATORS',
      payload: Array<string>,
    }
  | {
      type: 'SELECT_DEVICE',
      payload: BaseDevice,
    }
  | {
      type: 'SELECT_PLUGIN',
      payload: {
        selectedPlugin: ?string,
        selectedApp: ?string,
      },
    };

const DEFAULT_PLUGIN = 'DeviceLogs';

const INITAL_STATE: State = {
  devices: [],
  androidEmulators: [],
  selectedDevice: null,
  selectedApp: null,
  selectedPlugin: DEFAULT_PLUGIN,
};

export default function reducer(
  state: State = INITAL_STATE,
  action: Action,
): State {
  switch (action.type) {
    case 'SELECT_DEVICE': {
      const {payload} = action;
      return {
        ...state,
        selectedApp: null,
        selectedPlugin: DEFAULT_PLUGIN,
        selectedDevice: payload,
      };
    }
    case 'REGISTER_ANDROID_EMULATORS': {
      const {payload} = action;
      return {
        ...state,
        androidEmulators: payload,
      };
    }
    case 'REGISTER_DEVICE': {
      const {payload} = action;
      const devices = state.devices.concat(payload);
      let {selectedDevice} = state;
      let selection = {};
      if (!selectedDevice) {
        selectedDevice = payload;
        selection = {
          selectedApp: null,
          selectedPlugin: DEFAULT_PLUGIN,
        };
      }
      return {
        ...state,
        devices,
        // select device if none was selected before
        selectedDevice,
        ...selection,
      };
    }
    case 'UNREGISTER_DEVICES': {
      const {payload} = action;
      const {selectedDevice} = state;
      let selectedDeviceWasRemoved = false;
      const devices = state.devices.filter((device: BaseDevice) => {
        if (payload.has(device.serial)) {
          if (selectedDevice === device) {
            // removed device is the selected
            selectedDeviceWasRemoved = true;
          }
          return false;
        } else {
          return true;
        }
      });

      let selection = {};
      if (selectedDeviceWasRemoved) {
        selection = {
          selectedDevice: devices[devices.length - 1],
          selectedApp: null,
          selectedPlugin: DEFAULT_PLUGIN,
        };
      }

      return {
        ...state,
        devices,
        ...selection,
      };
    }
    case 'SELECT_PLUGIN': {
      const {payload} = action;

      return {
        ...state,
        ...payload,
      };
    }
    default:
      return state;
  }
}

export const selectDevice = (payload: BaseDevice): Action => ({
  type: 'SELECT_DEVICE',
  payload,
});

export const selectPlugin = (payload: {
  selectedPlugin: ?string,
  selectedApp: ?string,
}): Action => ({
  type: 'SELECT_PLUGIN',
  payload,
});
