/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {remote} from 'electron';
import {v1 as uuidv1} from 'uuid';
import {ReactElement} from 'react';
import CancellableExportStatus from '../chrome/CancellableExportStatus';
import {Actions} from './';
export const ACTIVE_SHEET_PLUGIN_SHEET: 'PLUGIN_SHEET' = 'PLUGIN_SHEET';
export const ACTIVE_SHEET_BUG_REPORTER: 'BUG_REPORTER' = 'BUG_REPORTER';
export const ACTIVE_SHEET_PLUGINS: 'PLUGINS' = 'PLUGINS';
export const ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT: 'SELECT_PLUGINS_TO_EXPORT' =
  'SELECT_PLUGINS_TO_EXPORT';
export const ACTIVE_SHEET_SHARE_DATA: 'SHARE_DATA' = 'SHARE_DATA';
export const ACTIVE_SHEET_SIGN_IN: 'SIGN_IN' = 'SIGN_IN';
export const ACTIVE_SHEET_SETTINGS: 'SETTINGS' = 'SETTINGS';
export const ACTIVE_SHEET_DOCTOR: 'DOCTOR' = 'DOCTOR';
export const ACTIVE_SHEET_SHARE_DATA_IN_FILE: 'SHARE_DATA_IN_FILE' =
  'SHARE_DATA_IN_FILE';
export const SET_EXPORT_STATUS_MESSAGE: 'SET_EXPORT_STATUS_MESSAGE' =
  'SET_EXPORT_STATUS_MESSAGE';
export const UNSET_SHARE: 'UNSET_SHARE' = 'UNSET_SHARE';
export const ACTIVE_SHEET_JS_EMULATOR_LAUNCHER: 'ACTIVE_SHEET_JS_EMULATOR_LAUNCHER' =
  'ACTIVE_SHEET_JS_EMULATOR_LAUNCHER';
export const ACTIVE_SHEET_CHANGELOG = 'ACTIVE_SHEET_CHANGELOG';
export const ACTIVE_SHEET_CHANGELOG_RECENT_ONLY =
  'ACTIVE_SHEET_CHANGELOG_RECENT_ONLY';

export type ActiveSheet =
  | typeof ACTIVE_SHEET_PLUGIN_SHEET
  | typeof ACTIVE_SHEET_BUG_REPORTER
  | typeof ACTIVE_SHEET_PLUGINS
  | typeof ACTIVE_SHEET_SHARE_DATA
  | typeof ACTIVE_SHEET_SIGN_IN
  | typeof ACTIVE_SHEET_SETTINGS
  | typeof ACTIVE_SHEET_DOCTOR
  | typeof ACTIVE_SHEET_SHARE_DATA_IN_FILE
  | typeof ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT
  | typeof ACTIVE_SHEET_JS_EMULATOR_LAUNCHER
  | typeof ACTIVE_SHEET_CHANGELOG
  | typeof ACTIVE_SHEET_CHANGELOG_RECENT_ONLY
  | null;

export type LauncherMsg = {
  message: string;
  severity: 'warning' | 'error';
};
export type ServerPorts = {
  insecure: number;
  secure: number;
};

export type StatusMessageType = {
  msg: string;
  sender: string;
};

type SubShareType =
  | {
      type: 'file';
      file: string;
    }
  | {
      type: 'link';
      url?: string;
    };

export type ShareType = {
  statusComponent?: React.ReactNode;
  closeOnFinish: boolean;
} & SubShareType;

export type State = {
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  rightSidebarAvailable: boolean;
  windowIsFocused: boolean;
  activeSheet: ActiveSheet;
  share: ShareType | null;
  sessionId: string | null;
  serverPorts: ServerPorts;
  downloadingImportData: boolean;
  launcherMsg: LauncherMsg;
  statusMessages: Array<string>;
  xcodeCommandLineToolsDetected: boolean;
};

type BooleanActionType =
  | 'leftSidebarVisible'
  | 'rightSidebarVisible'
  | 'rightSidebarAvailable'
  | 'downloadingImportData';

export type Action =
  | {
      type: BooleanActionType;
      payload?: boolean;
    }
  | {
      type: 'windowIsFocused';
      payload: {isFocused: boolean; time: number};
    }
  | {
      type: 'SET_ACTIVE_SHEET';
      payload: ActiveSheet;
    }
  | {
      type: typeof ACTIVE_SHEET_SHARE_DATA_IN_FILE;
      payload: {file: string; closeOnFinish: boolean};
    }
  | {
      type: typeof ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT;
      payload: ShareType;
    }
  | {
      type: 'SET_SERVER_PORTS';
      payload: {
        insecure: number;
        secure: number;
      };
    }
  | {
      type: 'LAUNCHER_MSG';
      payload: {
        severity: 'warning' | 'error';
        message: string;
      };
    }
  | {
      type: 'UNSET_SHARE';
    }
  | {
      type: 'SET_EXPORT_STATUS_MESSAGE';
      payload: React.ReactNode;
    }
  | {
      type: 'SET_EXPORT_URL';
      payload: string;
    }
  | {
      type: 'ADD_STATUS_MSG';
      payload: {msg: string; sender: string};
    }
  | {
      type: 'REMOVE_STATUS_MSG';
      payload: {msg: string; sender: string};
    }
  | {
      type: 'SET_XCODE_DETECTED';
      payload: {
        isDetected: boolean;
      };
    };

export const initialState: () => State = () => ({
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
  statusMessages: [],
  xcodeCommandLineToolsDetected: false,
  trackingTimeline: [],
});

function statusMessage(sender: string, msg: string): string {
  const messageTrimmed = msg.trim();
  const senderTrimmed = sender.trim();
  let statusMessage = senderTrimmed.length > 0 ? senderTrimmed : '';
  statusMessage =
    statusMessage.length > 0 && messageTrimmed.length > 0
      ? `${statusMessage}: ${messageTrimmed}`
      : '';
  return statusMessage;
}

export default function reducer(
  state: State | undefined,
  action: Actions,
): State {
  state = state || initialState();
  if (
    action.type === 'leftSidebarVisible' ||
    action.type === 'rightSidebarVisible' ||
    action.type === 'rightSidebarAvailable' ||
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
  } else if (action.type === 'windowIsFocused') {
    return {
      ...state,
      windowIsFocused: action.payload.isFocused,
    };
  } else if (action.type === 'SET_ACTIVE_SHEET') {
    return {
      ...state,
      activeSheet: action.payload,
    };
  } else if (action.type === ACTIVE_SHEET_SHARE_DATA_IN_FILE) {
    return {
      ...state,
      activeSheet: ACTIVE_SHEET_SHARE_DATA_IN_FILE,
      share: {
        type: 'file',
        file: action.payload.file,
        closeOnFinish: action.payload.closeOnFinish,
      },
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
  } else if (action.type === 'SET_EXPORT_STATUS_MESSAGE') {
    if (state.share) {
      const {share} = state;
      return {
        ...state,
        share: {...share, statusComponent: action.payload},
      };
    }
    return state;
  } else if (action.type === 'UNSET_SHARE') {
    return {...state, share: null};
  } else if (action.type === 'SET_EXPORT_URL') {
    const share = state.share;
    if (share && share.type === 'link') {
      return {...state, share: {...share, url: action.payload}};
    }
    return state;
  } else if (action.type === 'ADD_STATUS_MSG') {
    const {sender, msg} = action.payload;
    const statusMsg = statusMessage(sender, msg);
    if (statusMsg.length > 0) {
      return {
        ...state,
        statusMessages: [...state.statusMessages, statusMsg],
      };
    }
    return state;
  } else if (action.type === 'REMOVE_STATUS_MSG') {
    const {sender, msg} = action.payload;
    const statusMsg = statusMessage(sender, msg);
    if (statusMsg.length > 0) {
      const statusMessages = [...state.statusMessages];
      statusMessages.splice(statusMessages.indexOf(statusMsg), 1);
      return {...state, statusMessages};
    }
    return state;
  } else if (action.type === 'SET_XCODE_DETECTED') {
    return {...state, xcodeCommandLineToolsDetected: action.payload.isDetected};
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

export const unsetShare = (): Action => ({
  type: UNSET_SHARE,
});

export const setExportStatusComponent = (
  payload: ReactElement<typeof CancellableExportStatus>,
): Action => ({
  type: SET_EXPORT_STATUS_MESSAGE,
  payload,
});

export const setSelectPluginsToExportActiveSheet = (
  payload: ShareType,
): Action => ({
  type: ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
  payload,
});

export const setExportDataToFileActiveSheet = (payload: {
  file: string;
  closeOnFinish: boolean;
}): Action => ({
  type: ACTIVE_SHEET_SHARE_DATA_IN_FILE,
  payload: payload,
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

export const setExportURL = (result: string): Action => ({
  type: 'SET_EXPORT_URL',
  payload: result,
});

export const addStatusMessage = (payload: StatusMessageType): Action => ({
  type: 'ADD_STATUS_MSG',
  payload,
});

export const removeStatusMessage = (payload: StatusMessageType): Action => ({
  type: 'REMOVE_STATUS_MSG',
  payload,
});

export const setXcodeDetected = (isDetected: boolean): Action => ({
  type: 'SET_XCODE_DETECTED',
  payload: {isDetected},
});
