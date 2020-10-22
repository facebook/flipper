/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {produce} from 'immer';

import BaseDevice from '../devices/BaseDevice';
import MacDevice from '../devices/MacDevice';
import Client from '../Client';
import {UninitializedClient} from '../UninitializedClient';
import {isEqual} from 'lodash';
import {performance} from 'perf_hooks';
import isHeadless from '../utils/isHeadless';
import {Actions} from '.';
const WelcomeScreen = isHeadless()
  ? require('../chrome/WelcomeScreenHeadless').default
  : require('../chrome/WelcomeScreen').default;
import NotificationScreen from '../chrome/NotificationScreen';
import SupportRequestFormV2 from '../fb-stubs/SupportRequestFormV2';
import SupportRequestDetails from '../fb-stubs/SupportRequestDetails';
import {getPluginKey, isDevicePluginDefinition} from '../utils/pluginUtils';
import {deconstructClientId} from '../utils/clientUtils';
import {PluginDefinition} from '../plugin';
import {RegisterPluginAction} from './plugins';
import {ConsoleLogs} from '../chrome/ConsoleLogs';
import MetroDevice from '../devices/MetroDevice';

export type StaticView =
  | null
  | typeof WelcomeScreen
  | typeof NotificationScreen
  | typeof SupportRequestFormV2
  | typeof SupportRequestDetails
  | typeof ConsoleLogs;

export type State = {
  devices: Array<BaseDevice>;
  androidEmulators: Array<string>;
  selectedDevice: null | BaseDevice;
  selectedPlugin: null | string;
  selectedApp: null | string;
  userPreferredDevice: null | string;
  userPreferredPlugin: null | string;
  userPreferredApp: null | string;
  userStarredPlugins: {[client: string]: string[]};
  clients: Array<Client>;
  uninitializedClients: Array<{
    client: UninitializedClient;
    deviceId?: string;
    errorMessage?: string;
  }>;
  deepLinkPayload: unknown;
  staticView: StaticView;
};

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
        deepLinkPayload: unknown;
        selectedDevice?: null | BaseDevice;
        time: number;
      };
    }
  | {
      type: 'SELECT_USER_PREFERRED_PLUGIN';
      payload: string;
    }
  | {
      type: 'NEW_CLIENT';
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
      type: 'SET_STATIC_VIEW';
      payload: StaticView;
      deepLinkPayload: unknown;
    }
  | {
      // Implemented by rootReducer in `store.tsx`
      type: 'STAR_PLUGIN';
      payload: {
        selectedApp: string;
        plugin: PluginDefinition;
      };
    }
  | {
      type: 'SELECT_CLIENT';
      payload: string | null;
    }
  | RegisterPluginAction
  | {
      // Implemented by rootReducer in `store.tsx`
      type: 'UPDATE_PLUGIN';
      payload: PluginDefinition;
    };

const DEFAULT_PLUGIN = 'DeviceLogs';
const DEFAULT_DEVICE_BLACKLIST = [MacDevice, MetroDevice];
const INITAL_STATE: State = {
  devices: [],
  androidEmulators: [],
  selectedDevice: null,
  selectedApp: null,
  selectedPlugin: DEFAULT_PLUGIN,
  userPreferredDevice: null,
  userPreferredPlugin: null,
  userPreferredApp: null,
  userStarredPlugins: {},
  clients: [],
  uninitializedClients: [],
  deepLinkPayload: null,
  staticView: WelcomeScreen,
};

export default (state: State = INITAL_STATE, action: Actions): State => {
  switch (action.type) {
    case 'SET_STATIC_VIEW': {
      const {payload, deepLinkPayload} = action;
      const {selectedPlugin} = state;
      return {
        ...state,
        staticView: payload,
        selectedPlugin: payload != null ? null : selectedPlugin,
        deepLinkPayload: deepLinkPayload ?? null,
      };
    }

    case 'RESET_SUPPORT_FORM_V2_STATE': {
      return updateSelection({
        ...state,
        staticView: null,
      });
    }

    case 'SELECT_DEVICE': {
      const {payload} = action;
      return updateSelection({
        ...state,
        staticView: null,
        selectedDevice: payload,
        userPreferredDevice: payload
          ? payload.title
          : state.userPreferredDevice,
      });
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

      const newDevices = state.devices.slice();
      const existing = state.devices.findIndex(
        (device) => device.serial === payload.serial,
      );
      if (existing !== -1) {
        console.debug(
          `Got a new device instance for already existing serial ${payload.serial}`,
        );
        newDevices[existing] = payload;
      } else {
        newDevices.push(payload);
      }

      return updateSelection({
        ...state,
        devices: newDevices,
      });
    }

    case 'UNREGISTER_DEVICES': {
      const deviceSerials = action.payload;

      return updateSelection(
        produce(state, (draft) => {
          draft.devices = draft.devices.filter((device) => {
            if (!deviceSerials.has(device.serial)) {
              return true;
            } else {
              device.teardown();
              return false;
            }
          });
        }),
      );
    }
    case 'SELECT_PLUGIN': {
      const {payload} = action;
      const {selectedPlugin, selectedApp, deepLinkPayload} = payload;
      let selectedDevice = payload.selectedDevice;
      if (typeof deepLinkPayload === 'string') {
        const deepLinkParams = new URLSearchParams(deepLinkPayload);
        const deviceParam = deepLinkParams.get('device');
        if (deviceParam) {
          const deviceMatch = state.devices.find(
            (v) => v.title === deviceParam,
          );
          if (deviceMatch) {
            selectedDevice = deviceMatch;
          } else {
            console.warn(
              `Could not find matching device "${deviceParam}" requested through deep-link.`,
            );
          }
        }
      }
      if (!selectedDevice && selectedPlugin) {
        const selectedClient = state.clients.find((c) =>
          c.supportsPlugin(selectedPlugin),
        );
        selectedDevice = state.devices.find(
          (v) => v.serial === selectedClient?.query.device_id,
        );
      }
      if (!selectedDevice) {
        console.warn('Trying to select a plugin before a device was selected!');
      }
      if (selectedPlugin) {
        performance.mark(`activePlugin-${selectedPlugin}`);
      }

      return updateSelection({
        ...state,
        staticView: null,
        selectedApp: selectedApp || null,
        selectedPlugin,
        userPreferredPlugin: selectedPlugin || state.userPreferredPlugin,
        selectedDevice: selectedDevice!,
        userPreferredDevice:
          selectedDevice && canBeDefaultDevice(selectedDevice)
            ? selectedDevice.title
            : state.userPreferredDevice,
        deepLinkPayload: deepLinkPayload,
      });
    }

    case 'SELECT_USER_PREFERRED_PLUGIN': {
      const {payload} = action;
      return {...state, userPreferredPlugin: payload};
    }

    case 'NEW_CLIENT': {
      const {payload} = action;

      return updateSelection({
        ...state,
        clients: state.clients.concat(payload),
        uninitializedClients: state.uninitializedClients.filter((c) => {
          return (
            c.deviceId !== payload.query.device_id ||
            c.client.appName !== payload.query.app
          );
        }),
      });
    }

    case 'SELECT_CLIENT': {
      const {payload} = action;
      return updateSelection({
        ...state,
        selectedApp: payload,
        userPreferredApp: payload || state.userPreferredApp,
      });
    }

    case 'CLIENT_REMOVED': {
      const {payload} = action;
      return updateSelection({
        ...state,
        clients: state.clients.filter(
          (client: Client) => client.id !== payload,
        ),
      });
    }

    case 'PREFER_DEVICE': {
      const {payload: userPreferredDevice} = action;
      return {...state, userPreferredDevice};
    }
    case 'START_CLIENT_SETUP': {
      const {payload} = action;
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .filter((entry) => !isEqual(entry.client, payload))
          .concat([{client: payload}])
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
      };
    }
    case 'FINISH_CLIENT_SETUP': {
      const {payload} = action;
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .map((c) =>
            isEqual(c.client, payload.client)
              ? {...c, deviceId: payload.deviceId}
              : c,
          )
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
      };
    }
    case 'REGISTER_PLUGINS': {
      // plugins are registered after creating the base devices, so update them
      const plugins = action.payload;
      plugins.forEach((plugin) => {
        if (isDevicePluginDefinition(plugin)) {
          // smell: devices are mutable
          state.devices.forEach((device) => {
            device.loadDevicePlugin(plugin);
          });
        }
      });
      return state;
    }
    default:
      return state;
  }
};

export const selectDevice = (payload: BaseDevice): Action => ({
  type: 'SELECT_DEVICE',
  payload,
});

export const setStaticView = (
  payload: StaticView,
  deepLinkPayload?: unknown,
): Action => {
  if (!payload) {
    throw new Error('Cannot set empty static view');
  }
  return {
    type: 'SET_STATIC_VIEW',
    payload,
    deepLinkPayload,
  };
};

export const preferDevice = (payload: string): Action => ({
  type: 'PREFER_DEVICE',
  payload,
});

export const selectPlugin = (payload: {
  selectedPlugin: null | string;
  selectedApp?: null | string;
  selectedDevice?: BaseDevice | null;
  deepLinkPayload: unknown;
  time?: number;
}): Action => ({
  type: 'SELECT_PLUGIN',
  payload: {...payload, time: payload.time ?? Date.now()},
});

export const starPlugin = (payload: {
  plugin: PluginDefinition;
  selectedApp: string;
}): Action => ({
  type: 'STAR_PLUGIN',
  payload,
});

export const selectClient = (clientId: string | null): Action => ({
  type: 'SELECT_CLIENT',
  payload: clientId,
});

export const registerPluginUpdate = (payload: PluginDefinition): Action => ({
  type: 'UPDATE_PLUGIN',
  payload,
});

export function getAvailableClients(
  device: null | undefined | BaseDevice,
  clients: Client[],
): Client[] {
  if (!device) {
    return [];
  }
  return clients
    .filter(
      (client: Client) =>
        (device &&
          device.supportsOS(client.query.os) &&
          client.query.device_id === device.serial) ||
        // Old android sdk versions don't know their device_id
        // Display their plugins under all selected devices until they die out
        client.query.device_id === 'unknown',
    )
    .sort((a, b) => (a.query.app || '').localeCompare(b.query.app));
}

function getBestAvailableClient(
  device: BaseDevice | null | undefined,
  clients: Client[],
  preferredClient: string | null,
): Client | undefined {
  const availableClients = getAvailableClients(device, clients);
  if (availableClients.length === 0) {
    return undefined;
  }
  return (
    getClientById(availableClients, preferredClient) ||
    availableClients[0] ||
    null
  );
}

export function getClientById(
  clients: Client[],
  clientId: string | null | undefined,
): Client | undefined {
  return clients.find((client) => client.id === clientId);
}

export function canBeDefaultDevice(device: BaseDevice) {
  return !DEFAULT_DEVICE_BLACKLIST.some(
    (blacklistedDevice) => device instanceof blacklistedDevice,
  );
}

/**
 * This function, given the current state, tries to build to build the best
 * selection possible, preselection device if there is non, plugins based on preferences, etc
 * @param state
 */
function updateSelection(state: Readonly<State>): State {
  if (state.staticView && state.staticView !== WelcomeScreen) {
    return state;
  }

  const updates: Partial<State> = {
    staticView: null,
  };
  // Find the selected device if it still exists
  let device: BaseDevice | null =
    state.selectedDevice && state.devices.includes(state.selectedDevice)
      ? state.selectedDevice
      : null;
  if (!device) {
    device =
      state.devices.find(
        (device) => device.title === state.userPreferredDevice,
      ) ||
      state.devices.find((device) => canBeDefaultDevice(device)) ||
      null;
  }
  updates.selectedDevice = device;
  if (!device) {
    updates.staticView = WelcomeScreen;
  }

  // Select client based on device
  const client = getBestAvailableClient(
    device,
    state.clients,
    state.selectedApp || state.userPreferredApp,
  );
  updates.selectedApp = client ? client.id : null;

  const availablePlugins: string[] = [
    ...(device?.devicePlugins || []),
    ...(client?.plugins || []),
  ];

  if (
    // Try the preferred plugin first
    state.userPreferredPlugin &&
    availablePlugins.includes(state.userPreferredPlugin)
  ) {
    updates.selectedPlugin = state.userPreferredPlugin;
  } else if (
    !state.selectedPlugin ||
    !availablePlugins.includes(state.selectedPlugin)
  ) {
    // currently selected plugin is not available in this state,
    // fall back to the default
    updates.selectedPlugin = DEFAULT_PLUGIN;
  }

  return {...state, ...updates};
}

export function getSelectedPluginKey(state: State): string | undefined {
  return state.selectedPlugin
    ? getPluginKey(
        state.selectedApp,
        state.selectedDevice,
        state.selectedPlugin,
      )
    : undefined;
}

export function pluginIsStarred(
  userStarredPlugins: State['userStarredPlugins'],
  app: string | null,
  pluginId: string,
): boolean {
  if (!app) {
    return false;
  }
  const appInfo = deconstructClientId(app);
  const starred = userStarredPlugins[appInfo.app];
  return starred && starred.indexOf(pluginId) > -1;
}
