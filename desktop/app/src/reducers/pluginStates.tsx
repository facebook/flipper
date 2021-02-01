/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Actions} from '.';
import {deconstructPluginKey} from '../utils/clientUtils';

export type State = {
  [pluginKey: string]: any;
};

export const pluginKey = (serial: string, pluginName: string): string => {
  return `${serial}#${pluginName}`;
};

export type Action =
  | {
      type: 'SET_PLUGIN_STATE';
      payload: {
        pluginKey: string;
        state: Object;
      };
    }
  | {
      type: 'CLEAR_PLUGIN_STATE';
      payload: {clientId: string; devicePlugins: Set<string>};
    };

export default function reducer(
  state: State | undefined = {},
  action: Actions,
): State {
  if (action.type === 'SET_PLUGIN_STATE') {
    const newPluginState = action.payload.state;
    if (newPluginState && newPluginState !== state[action.payload.pluginKey]) {
      return {
        ...state,
        [action.payload.pluginKey]: {
          ...state[action.payload.pluginKey],
          ...newPluginState,
        },
      };
    }
    return {...state};
  } else if (action.type === 'CLEAR_PLUGIN_STATE') {
    const {payload} = action;
    return Object.keys(state).reduce((newState: State, pluginKey) => {
      // Only add the pluginState, if its from a plugin other than the one that
      // was removed. pluginKeys are in the form of ${clientID}#${pluginID}.
      const plugin = deconstructPluginKey(pluginKey);
      const clientId = plugin.client;
      const pluginId = plugin.pluginName;
      if (
        clientId !== payload.clientId ||
        (pluginId && payload.devicePlugins.has(pluginId))
      ) {
        newState[pluginKey] = state[pluginKey];
      }
      return newState;
    }, {});
  } else {
    return state;
  }
}

export const setPluginState = (payload: {
  pluginKey: string;
  state: Object;
}): Action => ({
  type: 'SET_PLUGIN_STATE',
  payload,
});
