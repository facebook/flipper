/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import BaseDevice from '../devices/BaseDevice';
import MacDevice from '../devices/MacDevice';
import Client from '../Client';
import {UninitializedClient} from '../UninitializedClient';
import {isEqual} from 'lodash';
import iosUtil from '../fb-stubs/iOSContainerUtility';
import {performance} from 'perf_hooks';

export type State = {
  devices: Array<BaseDevice>;
  androidEmulators: Array<string>;
  selectedDevice: null | BaseDevice;
  selectedPlugin: null | string;
  selectedApp: null | string;
  userPreferredDevice: null | string;
  userPreferredPlugin: null | string;
  userPreferredApp: null | string;
  userLRUPlugins: Map<string, Array<string>>;
  error: null | string;
  clients: Array<Client>;
  uninitializedClients: Array<{
    client: UninitializedClient;
    deviceId?: string;
    errorMessage?: string;
  }>;
  deepLinkPayload: null | string;
};

const MAX_MINIMUM_PLUGINS = 5;

export type Action =
  | {
      type: 'UNREGISTER_DEVICES';
      payload: Set<string>;
    }
  | {
      type: 'REGISTER_DEVICE';
      payload: BaseDevice;
    }
  | {
      type: 'REGISTER_ANDROID_EMULATORS';
      payload: Array<string>;
    }
  | {
      type: 'SELECT_DEVICE';
      payload: BaseDevice;
    }
  | {
      type: 'SELECT_PLUGIN';
      payload: {
        selectedPlugin: null | string;
        selectedApp?: null | string;
        deepLinkPayload: null | string;
      };
    }
  | {
      type: 'SELECT_USER_PREFERRED_PLUGIN';
      payload: string;
    }
  | {
      type: 'SERVER_ERROR';
      payload: null | string;
    }
  | {
      type: 'NEW_CLIENT';
      payload: Client;
    }
  | {
      type: 'NEW_CLIENT_SANITY_CHECK';
      payload: Client;
    }
  | {
      type: 'CLIENT_REMOVED';
      payload: string;
    }
  | {
      type: 'PREFER_DEVICE';
      payload: string;
    }
  | {
      type: 'START_CLIENT_SETUP';
      payload: UninitializedClient;
    }
  | {
      type: 'FINISH_CLIENT_SETUP';
      payload: {client: UninitializedClient; deviceId: string};
    }
  | {
      type: 'CLIENT_SETUP_ERROR';
      payload: {client: UninitializedClient; error: Error};
    }
  | {
      type: 'CLIENT_SHOW_MORE_OR_LESS';
      payload: string;
    };

const DEFAULT_PLUGIN = 'DeviceLogs';
const DEFAULT_DEVICE_BLACKLIST = [MacDevice];

const INITAL_STATE: State = {
  devices: [],
  androidEmulators: [],
  selectedDevice: null,
  selectedApp: null,
  selectedPlugin: DEFAULT_PLUGIN,
  userPreferredDevice: null,
  userPreferredPlugin: null,
  userPreferredApp: null,
  userLRUPlugins: new Map(),
  error: null,
  clients: [],
  uninitializedClients: [],
  deepLinkPayload: null,
};

const reducer = (state: State = INITAL_STATE, action: Action): State => {
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
      let selection: Partial<State> = {
        selectedApp: null,
        selectedPlugin: DEFAULT_PLUGIN,
      };

      const canBeDefaultDevice = !DEFAULT_DEVICE_BLACKLIST.some(
        blacklistedDevice => payload instanceof blacklistedDevice,
      );

      if (!selectedDevice && canBeDefaultDevice) {
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
          selectedDevice: devices[devices.length - 1] || null,
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

      const LRUPlugins = (
        state.userLRUPlugins[selectedApp || state.userPreferredApp] || []
      ).slice();
      const idxLRU = LRUPlugins.indexOf(selectedPlugin);
      if (idxLRU >= 0) {
        LRUPlugins.splice(idxLRU, 1);
      }
      LRUPlugins.unshift(selectedPlugin);
      LRUPlugins.splice(MAX_MINIMUM_PLUGINS);

      return {
        ...state,
        ...payload,
        userPreferredApp: selectedApp || state.userPreferredApp,
        userPreferredPlugin: selectedPlugin,
        userLRUPlugins: {...state.userLRUPlugins, [selectedApp]: LRUPlugins},
      };
    }
    case 'SELECT_USER_PREFERRED_PLUGIN': {
      const {payload} = action;
      return {...state, userPreferredPlugin: payload};
    }
    case 'NEW_CLIENT': {
      const {payload} = action;
      const {userPreferredApp, userPreferredPlugin, userLRUPlugins} = state;
      let {selectedApp, selectedPlugin} = state;

      const lessPlugins = (userLRUPlugins[payload.id] || []).slice();
      if (lessPlugins) {
        payload.lessPlugins = lessPlugins.concat(
          payload.plugins.filter(p => !lessPlugins.includes(p)),
        );
      } else {
        payload.lessPlugins = payload.plugins.slice();
      }
      payload.lessPlugins = payload.lessPlugins.slice(0, MAX_MINIMUM_PLUGINS);

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
        userLRUPlugins: {
          ...state.userLRUPlugins,
          [payload.id]: payload.lessPlugins,
        },
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

      const selected: Partial<State> = {};
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
    case 'CLIENT_SHOW_MORE_OR_LESS': {
      const {payload} = action;

      return {
        ...state,
        clients: state.clients.map((client: Client) => {
          if (client.id === payload) {
            client.showAllPlugins = !client.showAllPlugins;
            client.lessPlugins = state.userLRUPlugins[payload];
          }
          return client;
        }),
      };
    }
    default:
      return state;
  }
};

export default (state: State = INITAL_STATE, action: Action): State => {
  const nextState = reducer(state, action);

  if (nextState.selectedDevice) {
    const {selectedDevice} = nextState;
    const deviceNotSupportedError = 'iOS Devices are not yet supported';
    const error =
      selectedDevice.os === 'iOS' &&
      selectedDevice.deviceType === 'physical' &&
      !iosUtil.isAvailable()
        ? deviceNotSupportedError
        : null;

    if (nextState.error === deviceNotSupportedError) {
      nextState.error = error;
    } else {
      nextState.error = error || nextState.error;
    }
  }
  return nextState;
};

export const selectDevice = (payload: BaseDevice): Action => ({
  type: 'SELECT_DEVICE',
  payload,
});

export const preferDevice = (payload: string): Action => ({
  type: 'PREFER_DEVICE',
  payload,
});

export const selectPlugin = (payload: {
  selectedPlugin: null | string;
  selectedApp?: null | string;
  deepLinkPayload: null | string;
}): Action => ({
  type: 'SELECT_PLUGIN',
  payload,
});

export const showMoreOrLessPlugins = (payload: string): Action => ({
  type: 'CLIENT_SHOW_MORE_OR_LESS',
  payload,
});

export const userPreferredPlugin = (payload: string): Action => ({
  type: 'SELECT_USER_PREFERRED_PLUGIN',
  payload,
});
