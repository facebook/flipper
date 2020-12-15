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
  pluginActivationQueue: PluginActivationRequest[];
};

export type PluginActivationRequest = {
  plugin: ActivatablePluginDetails;
  enable: boolean;
  notifyIfFailed: boolean;
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
      type: 'ACTIVATE_PLUGINS';
      payload: PluginActivationRequest[];
    }
  | {
      type: 'PLUGIN_ACTIVATION_HANDLED';
      payload: number;
    };

const INITIAL_STATE: State = {
  installedPlugins: new Map<string, InstalledPluginDetails>(),
  uninstalledPlugins: new Set<string>(),
  pluginActivationQueue: [],
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
  } else if (action.type === 'ACTIVATE_PLUGINS') {
    return produce(state, (draft) => {
      draft.pluginActivationQueue.push(...action.payload);
    });
  } else if (action.type === 'PLUGIN_ACTIVATION_HANDLED') {
    return produce(state, (draft) => {
      draft.pluginActivationQueue.splice(0, action.payload);
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

export const activatePlugin = (payload: PluginActivationRequest): Action => ({
  type: 'ACTIVATE_PLUGINS',
  payload: [payload],
});

export const pluginActivationHandled = (payload: number): Action => ({
  type: 'PLUGIN_ACTIVATION_HANDLED',
  payload,
});
