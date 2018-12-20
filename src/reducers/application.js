/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {remote} from 'electron';

export type ActiveSheet = 'BUG_REPORTER' | 'PLUGIN_DEBUGGER' | null;

export type State = {
  leftSidebarVisible: boolean,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  windowIsFocused: boolean,
  activeSheet: ActiveSheet,
};

type BooleanActionType =
  | 'leftSidebarVisible'
  | 'rightSidebarVisible'
  | 'rightSidebarAvailable'
  | 'windowIsFocused';

export type Action =
  | {
      type: BooleanActionType,
      payload?: boolean,
    }
  | {
      type: 'SET_ACTIVE_SHEET',
      payload: ActiveSheet,
    };

const initialState: () => State = () => ({
  leftSidebarVisible: true,
  rightSidebarVisible: true,
  rightSidebarAvailable: false,
  windowIsFocused: remote.getCurrentWindow().isFocused(),
  activeSheet: null,
});

export default function reducer(state: State, action: Action): State {
  state = state || initialState();
  if (
    action.type === 'leftSidebarVisible' ||
    action.type === 'rightSidebarVisible' ||
    action.type === 'rightSidebarAvailable' ||
    action.type === 'windowIsFocused'
  ) {
    const newValue =
      typeof action.payload === 'undefined'
        ? !state[action.type]
        : action.payload;

    if (state[action.type] === newValue) {
      // value hasn't changed
      return state;
    } else {
      return {
        ...state,
        [action.type]: newValue,
      };
    }
  } else if (action.type === 'SET_ACTIVE_SHEET') {
    return {
      ...state,
      activeSheet: action.payload,
    };
  } else {
    return state;
  }
}

export const toggleAction = (
  type: BooleanActionType,
  payload?: boolean,
): Action => ({
  type,
  payload,
});

export const setActiveSheet = (payload: ActiveSheet): Action => ({
  type: 'SET_ACTIVE_SHEET',
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
