/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type State = {
  [pluginKey: string]: Object,
};

export const pluginKey = (serial: string, pluginName: string): string => {
  return `${serial}#${pluginName}`;
};

export type Action =
  | {
      type: 'SET_PLUGIN_STATE',
      payload: {
        pluginKey: string,
        state: Object,
      },
    }
  | {
      type: 'CLEAR_PLUGIN_STATE',
      payload: {id: string, devicePlugins: Set<string>},
    };

const INITIAL_STATE: State = {};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Action,
): State {
  if (action.type === 'SET_PLUGIN_STATE') {
    const newPluginState = action.payload.state;
    if (newPluginState && newPluginState !== state) {
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
    return Object.keys(state).reduce((newState, pluginKey) => {
      // Only add the pluginState, if its from a plugin other than the one that
      // was removed. pluginKeys are in the form of ${clientID}#${pluginID}.
      const pluginId = pluginKey.split('#').pop();
      if (pluginId !== payload.id || payload.devicePlugins.has(pluginId)) {
        newState[pluginKey] = state[pluginKey];
      }
      return newState;
    }, {});
  } else {
    return state;
  }
}

export const setPluginState = (payload: {
  pluginKey: string,
  state: Object,
}): Action => ({
  type: 'SET_PLUGIN_STATE',
  payload,
});
