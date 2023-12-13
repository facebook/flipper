/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';

export type LauncherMsg = {
  message: string;
  severity: 'warning' | 'error';
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
  isTroubleshootingModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isSetupWizardOpen: boolean;
  isNotificationModalOpen: boolean;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  rightSidebarAvailable: boolean;
  windowIsFocused: boolean;
  share: ShareType | null;
  launcherMsg: LauncherMsg;
  statusMessages: Array<string>;
};

type BooleanActionType =
  | 'hasLeftSidebar'
  | 'leftSidebarVisible'
  | 'isNotificationModalOpen'
  | 'isSettingsModalOpen'
  | 'isSetupWizardOpen'
  | 'rightSidebarVisible'
  | 'rightSidebarAvailable';

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
      type: 'LAUNCHER_MSG';
      payload: {
        severity: 'warning' | 'error';
        message: string;
      };
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
      type: 'TOGGLE_CONNECTIVITY_MODAL';
    };

export const initialState: () => State = () => ({
  topLevelSelection: 'appinspect',
  hasLeftSidebar: true,
  isTroubleshootingModalOpen: false,
  isSettingsModalOpen: false,
  isSetupWizardOpen: false,
  isNotificationModalOpen: false,
  leftSidebarVisible: true,
  rightSidebarVisible: true,
  rightSidebarAvailable: false,
  windowIsFocused: document.hasFocus(),
  activeSheet: null,
  share: null,
  launcherMsg: {
    severity: 'warning',
    message: '',
  },
  statusMessages: [],
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
    action.type === 'isSettingsModalOpen' ||
    action.type === 'isSetupWizardOpen' ||
    action.type === 'rightSidebarVisible' ||
    action.type === 'isNotificationModalOpen' ||
    action.type === 'rightSidebarAvailable'
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
  } else if (action.type === 'TOGGLE_CONNECTIVITY_MODAL') {
    return {
      ...state,
      isTroubleshootingModalOpen: !state.isTroubleshootingModalOpen,
    };
  } else if (action.type === 'windowIsFocused') {
    return {
      ...state,
      windowIsFocused: action.payload.isFocused,
    };
  } else if (action.type === 'LAUNCHER_MSG') {
    return {
      ...state,
      launcherMsg: action.payload,
    };
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

export const toggleConnectivityModal = (): Action => ({
  type: 'TOGGLE_CONNECTIVITY_MODAL',
});

export const toggleSettingsModal = (payload?: boolean): Action => ({
  type: 'isSettingsModalOpen',
  payload,
});

export const toggleSetupWizardOpen = (payload?: boolean): Action => ({
  type: 'isSetupWizardOpen',
  payload,
});

export const toggleLeftSidebarVisible = (payload?: boolean): Action => ({
  type: 'leftSidebarVisible',
  payload,
});

export const toggleHasLeftSidebar = (payload?: boolean): Action => ({
  type: 'hasLeftSidebar',
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

export const addStatusMessage = (payload: StatusMessageType): Action => ({
  type: 'ADD_STATUS_MSG',
  payload,
});

export const removeStatusMessage = (payload: StatusMessageType): Action => ({
  type: 'REMOVE_STATUS_MSG',
  payload,
});
