/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {remote} from 'electron';

export type State = {
  leftSidebarVisible: boolean,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  bugDialogVisible: boolean,
  windowIsFocused: boolean,
  pluginManagerVisible: boolean,
};

type ActionType =
  | 'leftSidebarVisible'
  | 'rightSidebarVisible'
  | 'rightSidebarAvailable'
  | 'bugDialogVisible'
  | 'windowIsFocused'
  | 'pluginManagerVisible';

export type Action = {
  type: ActionType,
  payload?: boolean,
};

const INITIAL_STATE: State = {
  leftSidebarVisible: true,
  rightSidebarVisible: true,
  rightSidebarAvailable: false,
  bugDialogVisible: false,
  windowIsFocused: remote.getCurrentWindow().isFocused(),
  pluginManagerVisible: false,
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Action,
): State {
  const newValue =
    typeof action.payload === 'undefined'
      ? !state[action.type]
      : action.payload;
  if (state[action.type] === newValue) {
    // value hasn't changed, do nothing
    return state;
  } else {
    return {
      ...state,
      [action.type]: newValue,
    };
  }
}

export const toggleAction = (type: ActionType, payload?: boolean): Action => ({
  type,
  payload,
});

export const toggleBugDialogVisible = (payload?: boolean): Action => ({
  type: 'bugDialogVisible',
  payload,
});

export const toggleLeftSidebarVisible = (payload?: boolean): Action => ({
  type: 'leftSidebarVisible',
  payload,
});

export const toggleRightSidebarVisible = (payload?: boolean): Action => ({
  type: 'rightSidebarVisible',
  payload,
});

export const toggleRightSidebarAvailable = (payload?: boolean): Action => ({
  type: 'rightSidebarAvailable',
  payload,
});

export const togglePluginManagerVisible = (payload?: boolean): Action => ({
  type: 'pluginManagerVisible',
  payload,
});
