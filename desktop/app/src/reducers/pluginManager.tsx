/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
import {PluginMap} from 'flipper-plugin-lib';

export type State = {
  installedPlugins: PluginMap;
};

export type Action = {
  type: 'REGISTER_INSTALLED_PLUGINS';
  payload: PluginMap;
};

const INITIAL_STATE: State = {
  installedPlugins: new Map(),
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
  } else {
    return state;
  }
}

export const registerInstalledPlugins = (payload: PluginMap): Action => ({
  type: 'REGISTER_INSTALLED_PLUGINS',
  payload,
});
