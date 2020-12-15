/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
import {PluginDetails} from 'flipper-plugin-lib';
import {produce} from 'immer';
import {PluginDefinition} from '../plugin';

export type State = {
  installedPlugins: PluginDetails[];
  removedPlugins: PluginDetails[];
};

export type Action =
  | {
      type: 'REGISTER_INSTALLED_PLUGINS';
      payload: PluginDetails[];
    }
  | {
      type: 'PLUGIN_FILES_REMOVED';
      payload: PluginDetails;
    }
  | {
      // Implemented by rootReducer in `store.tsx`
      type: 'UNINSTALL_PLUGIN';
      payload: PluginDefinition;
    };

const INITIAL_STATE: State = {
  installedPlugins: [],
  // plugins which were uninstalled recently and require file cleanup
  removedPlugins: [],
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'REGISTER_INSTALLED_PLUGINS') {
    return {
      ...state,
      installedPlugins: action.payload,
    };
  } else if (action.type === 'PLUGIN_FILES_REMOVED') {
    const plugin = action.payload;
    return produce(state, (draft) => {
      draft.removedPlugins = draft.removedPlugins.filter(
        (p) => p.id === plugin.id,
      );
    });
  } else {
    return state;
  }
}

export const registerInstalledPlugins = (payload: PluginDetails[]): Action => ({
  type: 'REGISTER_INSTALLED_PLUGINS',
  payload,
});

export const pluginFilesRemoved = (payload: PluginDetails): Action => ({
  type: 'PLUGIN_FILES_REMOVED',
  payload,
});

export const uninstallPlugin = (payload: PluginDefinition): Action => ({
  type: 'UNINSTALL_PLUGIN',
  payload,
});
