/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
import {InstalledPluginDetails} from 'flipper-plugin-lib';
import {PluginDefinition} from '../plugin';
import {produce} from 'immer';

export type State = {
  installedPlugins: InstalledPluginDetails[];
  uninstalledPlugins: Set<string>;
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
    };

const INITIAL_STATE: State = {
  installedPlugins: [],
  uninstalledPlugins: new Set<string>(),
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'REGISTER_INSTALLED_PLUGINS') {
    return produce(state, (draft) => {
      draft.installedPlugins = action.payload.filter(
        (p) => !state.uninstalledPlugins?.has(p.name),
      );
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
