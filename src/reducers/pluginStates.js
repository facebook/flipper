/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type State = {
  [pluginKey: string]: Object,
};

export type Action = {
  type: 'SET_PLUGIN_STATE',
  payload: {
    pluginKey: string,
    state: Object,
  },
};

const INITIAL_STATE: State = {};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Action,
): State {
  if (action.type === 'SET_PLUGIN_STATE') {
    return {
      ...state,
      [action.payload.pluginKey]: action.payload.state,
    };
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
