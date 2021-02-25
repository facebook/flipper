/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ComponentType} from 'react';
import {produce} from 'immer';

import type BaseDevice from '../devices/BaseDevice';
import MacDevice from '../devices/MacDevice';
import type Client from '../Client';
import type {UninitializedClient} from '../UninitializedClient';
import {isEqual} from 'lodash';
import {performance} from 'perf_hooks';
import type {Actions} from '.';
import {WelcomeScreenStaticView} from '../sandy-chrome/WelcomeScreen';
import {getPluginKey, isDevicePluginDefinition} from '../utils/pluginUtils';
import {deconstructClientId} from '../utils/clientUtils';
import type {RegisterPluginAction} from './plugins';
import MetroDevice from '../devices/MetroDevice';
import {Logger} from 'flipper-plugin';

export type StaticViewProps = {logger: Logger};

export type StaticView =
  | null
  | ComponentType<StaticViewProps>
  | React.FunctionComponent<any>;

export type State = StateV1;

export const persistVersion = 1;
export const persistMigrations = {
  1: (state: any) => {
    const stateV0 = state as StateV0;
    const stateV1 = {
      ...stateV0,
      enabledPlugins: stateV0.userStarredPlugins,
      enabledDevicePlugins: stateV0.userStarredDevicePlugins,
    };
    return stateV1 as any;
  },
};

type StateV1 = {
  devices: Array<BaseDevice>;
  androidEmulators: Array<string>;
  selectedDevice: null | BaseDevice;
  selectedPlugin: null | string;
  selectedApp: null | string;
  userPreferredDevice: null | string;
  userPreferredPlugin: null | string;
  userPreferredApp: null | string;
  enabledPlugins: {[client: string]: string[]};
  enabledDevicePlugins: Set<string>;
  clients: Array<Client>;
  uninitializedClients: Array<{
    client: UninitializedClient;
    deviceId?: string;
    errorMessage?: string;
  }>;
  deepLinkPayload: unknown;
  staticView: StaticView;
};

type StateV0 = Omit<StateV1, 'enabledPlugins' | 'enabledDevicePlugins'> & {
  userStarredPlugins: {[client: string]: string[]};
  userStarredDevicePlugins: Set<string>;
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
      type: 'SET_PLUGIN_ENABLED';
      payload: {
        pluginId: string;
        selectedApp: string;
      };
    }
  | {
      type: 'SET_DEVICE_PLUGIN_ENABLED';
      payload: {
        pluginId: string;
      };
    }
  | {
      type: 'SET_PLUGIN_DISABLED';
      payload: {
        pluginId: string;
        selectedApp: string;
      };
    }
  | {
      type: 'SET_DEVICE_PLUGIN_DISABLED';
      payload: {
        pluginId: string;
      };
    }
  | {
      type: 'SELECT_CLIENT';
      payload: string | null;
    }
  | RegisterPluginAction;

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
  enabledPlugins: {},
  enabledDevicePlugins: new Set([
    'DeviceLogs',
    'CrashReporter',
    'MobileBuilds',
    'Hermesdebuggerrn',
    'React',
  ]),
  clients: [],
  uninitializedClients: [],
  deepLinkPayload: null,
  staticView: WelcomeScreenStaticView,
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
        state.devices[existing].destroy();
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
              device.destroy();
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

      const newClients = state.clients.filter((client) => {
        if (client.id === payload.id) {
          console.error(
            `Received a new connection for client ${client.id}, but the old connection was not cleaned up`,
          );
          return false;
        }
        return true;
      });
      newClients.push(payload);

      return updateSelection({
        ...state,
        clients: newClients,
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

      const newClients = state.clients.filter(
        (client) => client.id !== payload,
      );
      return updateSelection({
        ...state,
        clients: newClients,
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
    case 'SET_PLUGIN_ENABLED': {
      const {pluginId, selectedApp} = action.payload;
      return produce(state, (draft) => {
        if (!draft.enabledPlugins[selectedApp]) {
          draft.enabledPlugins[selectedApp] = [];
        }
        const plugins = draft.enabledPlugins[selectedApp];
        const idx = plugins.indexOf(pluginId);
        if (idx === -1) {
          plugins.push(pluginId);
        }
      });
    }
    case 'SET_DEVICE_PLUGIN_ENABLED': {
      const {pluginId} = action.payload;
      return produce(state, (draft) => {
        draft.enabledDevicePlugins.add(pluginId);
      });
    }
    case 'SET_PLUGIN_DISABLED': {
      const {pluginId, selectedApp} = action.payload;
      return produce(state, (draft) => {
        if (!draft.enabledPlugins[selectedApp]) {
          draft.enabledPlugins[selectedApp] = [];
        }
        const plugins = draft.enabledPlugins[selectedApp];
        const idx = plugins.indexOf(pluginId);
        if (idx !== -1) {
          plugins.splice(idx, 1);
        }
      });
    }
    case 'SET_DEVICE_PLUGIN_DISABLED': {
      const {pluginId} = action.payload;
      return produce(state, (draft) => {
        draft.enabledDevicePlugins.delete(pluginId);
      });
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

export const selectClient = (clientId: string | null): Action => ({
  type: 'SELECT_CLIENT',
  payload: clientId,
});

export const setPluginEnabled = (pluginId: string, appId: string): Action => ({
  type: 'SET_PLUGIN_ENABLED',
  payload: {
    pluginId,
    selectedApp: appId,
  },
});

export const setDevicePluginEnabled = (pluginId: string): Action => ({
  type: 'SET_DEVICE_PLUGIN_ENABLED',
  payload: {
    pluginId,
  },
});

export const setDevicePluginDisabled = (pluginId: string): Action => ({
  type: 'SET_DEVICE_PLUGIN_DISABLED',
  payload: {
    pluginId,
  },
});

export const setPluginDisabled = (pluginId: string, appId: string): Action => ({
  type: 'SET_PLUGIN_DISABLED',
  payload: {
    pluginId,
    selectedApp: appId,
  },
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
  if (state.staticView && state.staticView !== WelcomeScreenStaticView) {
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
    updates.staticView = WelcomeScreenStaticView;
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

export function isPluginEnabled(
  enabledPlugins: State['enabledPlugins'],
  enabledDevicePlugins: State['enabledDevicePlugins'],
  app: string | null,
  pluginId: string,
): boolean {
  if (enabledDevicePlugins?.has(pluginId)) {
    return true;
  }
  if (!app || !enabledPlugins) {
    return false;
  }
  const appInfo = deconstructClientId(app);
  const enabledAppPlugins = enabledPlugins[appInfo.app];
  return enabledAppPlugins && enabledAppPlugins.indexOf(pluginId) > -1;
}
