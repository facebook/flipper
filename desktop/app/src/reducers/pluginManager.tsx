/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
import {
  ActivatablePluginDetails,
  InstalledPluginDetails,
} from 'flipper-plugin-lib';
import {PluginDefinition} from '../plugin';
import {produce} from 'immer';
import semver from 'semver';

export type State = {
  installedPlugins: Map<string, InstalledPluginDetails>;
  uninstalledPlugins: Set<string>;
  pluginCommandsQueue: PluginCommand[];
};

export type PluginCommand = LoadPluginAction;

export type LoadPluginActionPayload = {
  plugin: ActivatablePluginDetails;
  enable: boolean;
  notifyIfFailed: boolean;
};

export type LoadPluginAction = {
  type: 'LOAD_PLUGIN';
  payload: LoadPluginActionPayload;
};

export type Action =
  | {
      type: 'REGISTER_INSTALLED_PLUGINS';
      payload: InstalledPluginDetails[];
    }
  | {
      // Implemented by rootReducer in `store.tsx`
      type: 'UNINSTALL_PLUGIN';
      payload: PluginDefinition;
    }
  | {
      type: 'PLUGIN_INSTALLED';
      payload: InstalledPluginDetails;
    }
  | {
      type: 'PLUGIN_COMMANDS_PROCESSED';
      payload: number;
    }
  | LoadPluginAction;

const INITIAL_STATE: State = {
  installedPlugins: new Map<string, InstalledPluginDetails>(),
  uninstalledPlugins: new Set<string>(),
  pluginCommandsQueue: [],
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'REGISTER_INSTALLED_PLUGINS') {
    return produce(state, (draft) => {
      draft.installedPlugins = new Map(
        action.payload
          .filter((p) => !state.uninstalledPlugins?.has(p.name))
          .map((p) => [p.name, p]),
      );
    });
  } else if (action.type === 'PLUGIN_INSTALLED') {
    const plugin = action.payload;
    return produce(state, (draft) => {
      const existing = draft.installedPlugins.get(plugin.name);
      if (!existing || semver.gt(plugin.version, existing.version)) {
        draft.installedPlugins.set(plugin.name, plugin);
      }
    });
  } else if (action.type === 'LOAD_PLUGIN') {
    return produce(state, (draft) => {
      draft.pluginCommandsQueue.push({
        type: 'LOAD_PLUGIN',
        payload: action.payload,
      });
    });
  } else if (action.type === 'PLUGIN_COMMANDS_PROCESSED') {
    return produce(state, (draft) => {
      draft.pluginCommandsQueue.splice(0, action.payload);
    });
  } else {
    return {...state};
  }
}

export const registerInstalledPlugins = (
  payload: InstalledPluginDetails[],
): Action => ({
  type: 'REGISTER_INSTALLED_PLUGINS',
  payload,
});

export const uninstallPlugin = (payload: PluginDefinition): Action => ({
  type: 'UNINSTALL_PLUGIN',
  payload,
});

export const pluginInstalled = (payload: InstalledPluginDetails): Action => ({
  type: 'PLUGIN_INSTALLED',
  payload,
});

export const loadPlugin = (payload: LoadPluginActionPayload): Action => ({
  type: 'LOAD_PLUGIN',
  payload,
});

export const pluginCommandsProcessed = (payload: number): Action => ({
  type: 'PLUGIN_COMMANDS_PROCESSED',
  payload,
});
