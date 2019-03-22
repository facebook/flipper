/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type BaseDevice from '../devices/BaseDevice';
import type Client from '../Client';
import type {UninitializedClient} from '../UninitializedClient';
import {isEqual} from 'lodash';
import iosUtil from '../fb-stubs/iOSContainerUtility';
// $FlowFixMe perf_hooks is a new API in node
import {performance} from 'perf_hooks';

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
  uninitializedClients: Array<{
    client: UninitializedClient,
    deviceId?: string,
    errorMessage?: string,
  }>,
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
      type: 'NEW_CLIENT_SANITY_CHECK',
      payload: Client,
    }
  | {
      type: 'CLIENT_REMOVED',
      payload: string,
    }
  | {
      type: 'PREFER_DEVICE',
      payload: string,
    }
  | {
      type: 'START_CLIENT_SETUP',
      payload: UninitializedClient,
    }
  | {
      type: 'FINISH_CLIENT_SETUP',
      payload: {client: UninitializedClient, deviceId: string},
    }
  | {
      type: 'CLIENT_SETUP_ERROR',
      payload: {client: UninitializedClient, error: Error},
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
  uninitializedClients: [],
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

      const error =
        payload.os === 'iOS' &&
        payload.deviceType === 'physical' &&
        !iosUtil.isAvailable()
          ? 'iOS Devices are not yet supported'
          : null;

      return {
        ...state,
        devices,
        // select device if none was selected before
        selectedDevice,
        ...selection,
        error: error || state.error,
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
        uninitializedClients: state.uninitializedClients.filter(c => {
          return (
            c.deviceId !== payload.query.device_id ||
            c.client.appName !== payload.query.app
          );
        }),
        selectedApp,
        selectedPlugin,
      };
    }
    case 'NEW_CLIENT_SANITY_CHECK': {
      const {payload} = action;
      // Check for clients initialised when there is no matching device
      const clientIsStillConnected = state.clients.filter(
        client => client.id == payload.query.device_id,
      );
      if (clientIsStillConnected) {
        const matchingDeviceForClient = state.devices.filter(
          device => payload.query.device_id === device.serial,
        );
        if (matchingDeviceForClient.length === 0) {
          console.error(
            `Client initialised for non-displayed device: ${payload.id}`,
          );
        }
      }

      return state;
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
    case 'START_CLIENT_SETUP': {
      const {payload} = action;
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .filter(entry => !isEqual(entry.client, payload))
          .concat([{client: payload}])
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
      };
    }
    case 'FINISH_CLIENT_SETUP': {
      const {payload} = action;
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .map(c =>
            isEqual(c.client, payload.client)
              ? {...c, deviceId: payload.deviceId}
              : c,
          )
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
      };
    }
    case 'CLIENT_SETUP_ERROR': {
      const {payload} = action;

      const errorMessage =
        payload.error instanceof Error ? payload.error.message : payload.error;
      console.error(
        `Client setup error: ${errorMessage} while setting up client: ${
          payload.client.os
        }:${payload.client.deviceName}:${payload.client.appName}`,
      );
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .map(c =>
            isEqual(c.client, payload.client)
              ? {...c, errorMessage: errorMessage}
              : c,
          )
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
        error: `Client setup error: ${errorMessage}`,
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
