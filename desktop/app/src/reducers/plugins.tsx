/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {
  DevicePluginMap,
  ClientPluginMap,
  PluginDefinition,
} from '../plugin';
import type {
  DownloadablePluginDetails,
  ActivatablePluginDetails,
  BundledPluginDetails,
  InstalledPluginDetails,
} from 'flipper-plugin-lib';
import type {Actions} from '.';
import produce from 'immer';
import {isDevicePluginDefinition} from '../utils/pluginUtils';
import semver from 'semver';

export type State = {
  devicePlugins: DevicePluginMap;
  clientPlugins: ClientPluginMap;
  loadedPlugins: Map<string, ActivatablePluginDetails>;
  bundledPlugins: Map<string, BundledPluginDetails>;
  gatekeepedPlugins: Array<ActivatablePluginDetails>;
  disabledPlugins: Array<ActivatablePluginDetails>;
  failedPlugins: Array<[ActivatablePluginDetails, string]>;
  selectedPlugins: Array<string>;
  marketplacePlugins: Array<DownloadablePluginDetails>;
  uninstalledPlugins: Set<string>;
  installedPlugins: Map<string, InstalledPluginDetails>;
};

export type RegisterPluginAction = {
  type: 'REGISTER_PLUGINS';
  payload: PluginDefinition[];
};

export type Action =
  | RegisterPluginAction
  | {
      type: 'GATEKEEPED_PLUGINS';
      payload: Array<ActivatablePluginDetails>;
    }
  | {
      type: 'DISABLED_PLUGINS';
      payload: Array<ActivatablePluginDetails>;
    }
  | {
      type: 'FAILED_PLUGINS';
      payload: Array<[ActivatablePluginDetails, string]>;
    }
  | {
      type: 'SELECTED_PLUGINS';
      payload: Array<string>;
    }
  | {
      type: 'MARKETPLACE_PLUGINS';
      payload: Array<DownloadablePluginDetails>;
    }
  | {
      type: 'REGISTER_LOADED_PLUGINS';
      payload: Array<ActivatablePluginDetails>;
    }
  | {
      type: 'REGISTER_BUNDLED_PLUGINS';
      payload: Array<BundledPluginDetails>;
    }
  | {
      type: 'REGISTER_INSTALLED_PLUGINS';
      payload: InstalledPluginDetails[];
    }
  | {
      type: 'PLUGIN_INSTALLED';
      payload: InstalledPluginDetails;
    }
  | {
      type: 'PLUGIN_UNINSTALLED';
      payload: ActivatablePluginDetails;
    };

const INITIAL_STATE: State = {
  devicePlugins: new Map(),
  clientPlugins: new Map(),
  loadedPlugins: new Map(),
  bundledPlugins: new Map(),
  gatekeepedPlugins: [],
  disabledPlugins: [],
  failedPlugins: [],
  selectedPlugins: [],
  marketplacePlugins: [],
  uninstalledPlugins: new Set(),
  installedPlugins: new Map(),
};

export default function reducer(
  state: State | undefined = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'REGISTER_PLUGINS') {
    return produce(state, (draft) => {
      const {devicePlugins, clientPlugins} = draft;
      action.payload.forEach((p) => {
        if (devicePlugins.has(p.id) || clientPlugins.has(p.id)) {
          return;
        }

        if (isDevicePluginDefinition(p)) {
          devicePlugins.set(p.id, p);
        } else {
          clientPlugins.set(p.id, p);
        }
      });
    });
  } else if (action.type === 'GATEKEEPED_PLUGINS') {
    return {
      ...state,
      gatekeepedPlugins: state.gatekeepedPlugins.concat(action.payload),
    };
  } else if (action.type === 'DISABLED_PLUGINS') {
    return {
      ...state,
      disabledPlugins: state.disabledPlugins.concat(action.payload),
    };
  } else if (action.type === 'FAILED_PLUGINS') {
    return {
      ...state,
      failedPlugins: state.failedPlugins.concat(action.payload),
    };
  } else if (action.type === 'SELECTED_PLUGINS') {
    return {
      ...state,
      selectedPlugins: action.payload,
    };
  } else if (action.type === 'MARKETPLACE_PLUGINS') {
    return {
      ...state,
      marketplacePlugins: action.payload,
    };
  } else if (action.type === 'REGISTER_LOADED_PLUGINS') {
    return {
      ...state,
      loadedPlugins: new Map(action.payload.map((p) => [p.id, p])),
    };
  } else if (action.type === 'REGISTER_BUNDLED_PLUGINS') {
    return {
      ...state,
      bundledPlugins: new Map(action.payload.map((p) => [p.id, p])),
    };
  } else if (action.type === 'REGISTER_INSTALLED_PLUGINS') {
    return produce(state, (draft) => {
      draft.installedPlugins.clear();
      action.payload.forEach((p) => {
        if (!draft.uninstalledPlugins.has(p.id)) {
          draft.installedPlugins.set(p.id, p);
        }
      });
    });
  } else if (action.type === 'PLUGIN_INSTALLED') {
    const plugin = action.payload;
    return produce(state, (draft) => {
      const existing = draft.installedPlugins.get(plugin.name);
      if (!existing || semver.gt(plugin.version, existing.version)) {
        draft.installedPlugins.set(plugin.name, plugin);
      }
    });
  } else if (action.type === 'PLUGIN_UNINSTALLED') {
    const plugin = action.payload;
    return produce(state, (draft) => {
      draft.clientPlugins.delete(plugin.id);
      draft.devicePlugins.delete(plugin.id);
      draft.loadedPlugins.delete(plugin.id);
      draft.uninstalledPlugins.add(plugin.name);
    });
  } else {
    return state;
  }
}

export const selectedPlugins = (payload: Array<string>): Action => ({
  type: 'SELECTED_PLUGINS',
  payload,
});

export const registerPlugins = (payload: PluginDefinition[]): Action => ({
  type: 'REGISTER_PLUGINS',
  payload,
});

export const addGatekeepedPlugins = (
  payload: Array<ActivatablePluginDetails>,
): Action => ({
  type: 'GATEKEEPED_PLUGINS',
  payload,
});

export const addDisabledPlugins = (
  payload: Array<ActivatablePluginDetails>,
): Action => ({
  type: 'DISABLED_PLUGINS',
  payload,
});

export const addFailedPlugins = (
  payload: Array<[ActivatablePluginDetails, string]>,
): Action => ({
  type: 'FAILED_PLUGINS',
  payload,
});

export const registerMarketplacePlugins = (
  payload: Array<DownloadablePluginDetails>,
): Action => ({
  type: 'MARKETPLACE_PLUGINS',
  payload,
});

export const registerLoadedPlugins = (
  payload: Array<ActivatablePluginDetails>,
): Action => ({
  type: 'REGISTER_LOADED_PLUGINS',
  payload,
});

export const registerBundledPlugins = (
  payload: Array<BundledPluginDetails>,
): Action => ({
  type: 'REGISTER_BUNDLED_PLUGINS',
  payload,
});

export const registerInstalledPlugins = (
  payload: InstalledPluginDetails[],
): Action => ({
  type: 'REGISTER_INSTALLED_PLUGINS',
  payload,
});

export const pluginInstalled = (payload: InstalledPluginDetails): Action => ({
  type: 'PLUGIN_INSTALLED',
  payload,
});

export const pluginUninstalled = (
  payload: ActivatablePluginDetails,
): Action => ({
  type: 'PLUGIN_UNINSTALLED',
  payload,
});
