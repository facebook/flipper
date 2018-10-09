/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Notification, NotificationSet} from '../plugin';

type PluginNotification = {|
  id: string,
  notification: Notification,
  pluginId: string,
|};

export type State = {
  activeNotifications: Array<PluginNotification>,
  invalidatedNotifications: Array<PluginNotification>,
};

type ActiveNotificationsAction = {
  type: 'SET_ACTIVE_NOTIFICATIONS',
  payload: NotificationSet,
  pluginId: string,
};

type ClearAllAction = {
  type: 'CLEAR_ALL_NOTIFICATIONS',
};

export type Action = ActiveNotificationsAction | ClearAllAction;

const INITIAL_STATE: State = {
  activeNotifications: [],
  invalidatedNotifications: [],
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Action,
): State {
  switch (action.type) {
    case 'SET_ACTIVE_NOTIFICATIONS': {
      return activeNotificationsReducer(state, action);
    }
    case 'CLEAR_ALL_NOTIFICATIONS':
      // Q: Should this actually delete them, or just invalidate them?
      return INITIAL_STATE;
    default:
      return state;
  }
}

function activeNotificationsReducer(
  state: State,
  action: ActiveNotificationsAction,
) {
  const {payload, pluginId} = action;
  const newActiveNotifications = [];
  const newInactivatedNotifications = state.invalidatedNotifications;
  for (const activeNotification of state.activeNotifications) {
    if (activeNotification.pluginId !== pluginId) {
      newActiveNotifications.push(activeNotification);
      continue;
    }

    if (!payload[activeNotification.id]) {
      newInactivatedNotifications.push(activeNotification);
    }
  }

  for (const id in payload) {
    const newNotification = {
      id,
      notification: payload[id],
      pluginId,
    };
    newActiveNotifications.push(newNotification);
  }
  return {
    activeNotifications: newActiveNotifications,
    invalidatedNotifications: newInactivatedNotifications,
  };
}

export function setActiveNotifications(payload: {
  notifications: {
    [id: string]: Notification,
  },
  pluginId: string,
}): Action {
  const {notifications, pluginId} = payload;
  return {
    type: 'SET_ACTIVE_NOTIFICATIONS',
    payload: notifications,
    pluginId,
  };
}

export function clearAllNotifications(): Action {
  return {
    type: 'CLEAR_ALL_NOTIFICATIONS',
  };
}
