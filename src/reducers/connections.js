/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type BaseDevice from '../devices/BaseDevice';
import type Client from '../Client';

export type State = {|
  devices: Array<BaseDevice>,
  androidEmulators: Array<string>,
  selectedDevice: ?BaseDevice,
  selectedPlugin: ?string,
  selectedApp: ?string,
  userPreferredDevice: ?string,
  userPreferredPlugin: ?string,
  userPreferredApp: ?string,
  error: ?string,
  clients: Array<Client>,
  deepLinkPayload: ?string,
|};

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
      payload: {|
        selectedPlugin: ?string,
        selectedApp: ?string,
        deepLinkPayload: ?string,
      |},
    }
  | {
      type: 'SELECT_USER_PREFERRED_PLUGIN',
      payload: string,
    }
  | {
      type: 'SERVER_ERROR',
      payload: ?string,
    }
  | {
      type: 'NEW_CLIENT',
      payload: Client,
    }
  | {
      type: 'CLIENT_REMOVED',
      payload: string,
    }
  | {
      type: 'PREFER_DEVICE',
      payload: string,
    };

const DEFAULT_PLUGIN = 'DeviceLogs';

const INITAL_STATE: State = {
  devices: [],
  androidEmulators: [],
  selectedDevice: null,
  selectedApp: null,
  selectedPlugin: DEFAULT_PLUGIN,
  userPreferredDevice: null,
  userPreferredPlugin: null,
  userPreferredApp: null,
  error: null,
  clients: [],
  deepLinkPayload: null,
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
        userPreferredDevice: payload.title,
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
      let {selectedDevice, selectedPlugin} = state;

      // select the default plugin
      let selection = {
        selectedApp: null,
        selectedPlugin: DEFAULT_PLUGIN,
      };

      if (!selectedDevice) {
        selectedDevice = payload;
        if (selectedPlugin) {
          // We already had a plugin selected, but no device. This is happening
          // when the Client connected before the Device.
          selection = {};
        }
      } else if (payload.title === state.userPreferredDevice) {
        selectedDevice = payload;
      } else {
        // We didn't select the newly connected device, so we don't want to
        // change the plugin.
        selection = {};
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
      const {selectedPlugin, selectedApp} = payload;
      if (selectedPlugin) {
        performance.mark(`activePlugin-${selectedPlugin}`);
      }

      return {
        ...state,
        ...payload,
        userPreferredApp: selectedApp || state.userPreferredApp,
        userPreferredPlugin: selectedPlugin,
      };
    }
    case 'SELECT_USER_PREFERRED_PLUGIN': {
      const {payload} = action;
      return {...state, userPreferredPlugin: payload};
    }
    case 'NEW_CLIENT': {
      const {payload} = action;
      const {userPreferredApp, userPreferredPlugin} = state;
      let {selectedApp, selectedPlugin} = state;

      if (
        userPreferredApp &&
        userPreferredPlugin &&
        payload.id === userPreferredApp &&
        payload.plugins.includes(userPreferredPlugin)
      ) {
        // user preferred client did reconnect, so let's select it
        selectedApp = userPreferredApp;
        selectedPlugin = userPreferredPlugin;
      }

      return {
        ...state,
        clients: state.clients.concat(payload),
        selectedApp,
        selectedPlugin,
      };
    }
    case 'CLIENT_REMOVED': {
      const {payload} = action;

      let selected = {};
      if (state.selectedApp === payload) {
        selected.selectedApp = null;
        selected.selectedPlugin = DEFAULT_PLUGIN;
      }

      return {
        ...state,
        ...selected,
        clients: state.clients.filter(
          (client: Client) => client.id !== payload,
        ),
      };
    }
    case 'PREFER_DEVICE': {
      const {payload: userPreferredDevice} = action;
      return {...state, userPreferredDevice};
    }
    case 'SERVER_ERROR': {
      const {payload} = action;
      return {...state, error: payload};
    }
    default:
      return state;
  }
}

export const selectDevice = (payload: BaseDevice): Action => ({
  type: 'SELECT_DEVICE',
  payload,
});

export const preferDevice = (payload: string): Action => ({
  type: 'PREFER_DEVICE',
  payload,
});

export const selectPlugin = (payload: {|
  selectedPlugin: ?string,
  selectedApp?: ?string,
  deepLinkPayload: ?string,
|}): Action => ({
  type: 'SELECT_PLUGIN',
  payload,
});
export const userPreferredPlugin = (payload: string): Action => ({
  type: 'SELECT_USER_PREFERRED_PLUGIN',
  payload,
});
