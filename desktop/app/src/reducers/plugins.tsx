/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DevicePluginMap, ClientPluginMap, PluginDefinition} from '../plugin';
import {
  DownloadablePluginDetails,
  ActivatablePluginDetails,
  BundledPluginDetails,
} from 'flipper-plugin-lib';
import {Actions} from '.';
import produce from 'immer';
import {isDevicePluginDefinition} from '../utils/pluginUtils';

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
