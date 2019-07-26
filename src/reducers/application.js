/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {remote} from 'electron';
import uuidv1 from 'uuid/v1';

export const ACTIVE_SHEET_PLUGIN_SHEET: 'PLUGIN_SHEET' = 'PLUGIN_SHEET';
export const ACTIVE_SHEET_BUG_REPORTER: 'BUG_REPORTER' = 'BUG_REPORTER';
export const ACTIVE_SHEET_PLUGIN_DEBUGGER: 'PLUGIN_DEBUGGER' =
  'PLUGIN_DEBUGGER';
export const ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT: 'SELECT_PLUGINS_TO_EXPORT' =
  'SELECT_PLUGINS_TO_EXPORT';
export const ACTIVE_SHEET_SHARE_DATA: 'SHARE_DATA' = 'SHARE_DATA';
export const ACTIVE_SHEET_SIGN_IN: 'SIGN_IN' = 'SIGN_IN';
export const ACTIVE_SHEET_SHARE_DATA_IN_FILE: 'SHARE_DATA_IN_FILE' =
  'SHARE_DATA_IN_FILE';

export type ActiveSheet =
  | typeof ACTIVE_SHEET_PLUGIN_SHEET
  | typeof ACTIVE_SHEET_BUG_REPORTER
  | typeof ACTIVE_SHEET_PLUGIN_DEBUGGER
  | typeof ACTIVE_SHEET_SHARE_DATA
  | typeof ACTIVE_SHEET_SIGN_IN
  | typeof ACTIVE_SHEET_SHARE_DATA_IN_FILE
  | typeof ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT
  | null;

export type LauncherMsg = {
  message: string,
  severity: 'warning' | 'error',
};
export type ServerPorts = {
  insecure: number,
  secure: number,
};

export type ShareType =
  | {
      type: 'file',
      file: string,
    }
  | {type: 'link'};

export type State = {
  leftSidebarVisible: boolean,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  windowIsFocused: boolean,
  activeSheet: ActiveSheet,
  share: ?ShareType,
  sessionId: ?string,
  serverPorts: ServerPorts,
  downloadingImportData: boolean,
  launcherMsg: LauncherMsg,
  flipperRating: ?number,
};

type BooleanActionType =
  | 'leftSidebarVisible'
  | 'rightSidebarVisible'
  | 'rightSidebarAvailable'
  | 'windowIsFocused'
  | 'downloadingImportData';

export type Action =
  | {
      type: BooleanActionType,
      payload?: boolean,
    }
  | {
      type: 'SET_ACTIVE_SHEET',
      payload: ActiveSheet,
    }
  | {
      type: typeof ACTIVE_SHEET_SHARE_DATA_IN_FILE,
      payload: {file: string},
    }
  | {
      type: typeof ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
      payload: ShareType,
    }
  | {
      type: 'SET_SERVER_PORTS',
      payload: {
        insecure: number,
        secure: number,
      },
    }
  | {
      type: 'LAUNCHER_MSG',
      payload: {
        severity: 'warning' | 'error',
        message: string,
      },
    }
  | {
      type: 'SET_FLIPPER_RATING',
      payload: {
        rating: number,
      },
    };

const initialState: () => State = () => ({
  leftSidebarVisible: true,
  rightSidebarVisible: true,
  rightSidebarAvailable: false,
  windowIsFocused: remote.getCurrentWindow().isFocused(),
  activeSheet: null,
  share: null,
  sessionId: uuidv1(),
  serverPorts: {
    insecure: 8089,
    secure: 8088,
  },
  downloadingImportData: false,
  launcherMsg: {
    severity: 'warning',
    message: '',
  },
  flipperRating: null,
});

export default function reducer(state: State, action: Action): State {
  state = state || initialState();
  if (
    action.type === 'leftSidebarVisible' ||
    action.type === 'rightSidebarVisible' ||
    action.type === 'rightSidebarAvailable' ||
    action.type === 'windowIsFocused' ||
    action.type === 'downloadingImportData'
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
  } else if (action.type === ACTIVE_SHEET_SHARE_DATA_IN_FILE) {
    return {
      ...state,
      activeSheet: ACTIVE_SHEET_SHARE_DATA_IN_FILE,
      share: {type: 'file', file: action.payload.file},
    };
  } else if (action.type === ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT) {
    return {
      ...state,
      activeSheet: ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
      share: action.payload,
    };
  } else if (action.type === 'SET_SERVER_PORTS') {
    return {
      ...state,
      serverPorts: action.payload,
    };
  } else if (action.type === 'LAUNCHER_MSG') {
    return {
      ...state,
      launcherMsg: action.payload,
    };
  } else if (action.type === 'SET_FLIPPER_RATING') {
    return {
      ...state,
      flipperRating: action.payload.rating,
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

export const setSelectPluginsToExportActiveSheet = (
  payload: ShareType,
): Action => ({
  type: ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
  payload,
});

export const setExportDataToFileActiveSheet = (file: string): Action => ({
  type: ACTIVE_SHEET_SHARE_DATA_IN_FILE,
  payload: {file},
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

export const setFlipperRating = (rating: number): Action => ({
  type: 'SET_FLIPPER_RATING',
  payload: {
    rating,
  },
});
