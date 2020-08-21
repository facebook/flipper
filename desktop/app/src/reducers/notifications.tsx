/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Notification} from '../plugin';
import {Actions} from './';
import {getStringFromErrorLike} from '../utils';
export type PluginNotification = {
  notification: Notification;
  pluginId: string;
  client: null | string;
};

export type State = {
  activeNotifications: Array<PluginNotification>;
  invalidatedNotifications: Array<PluginNotification>;
  blacklistedPlugins: Array<string>;
  blacklistedCategories: Array<string>;
  clearedNotifications: Set<string>;
};

type ActiveNotificationsAction = {
  type: 'SET_ACTIVE_NOTIFICATIONS';
  payload: {
    notifications: Array<Notification>;
    client: null | string;
    pluginId: string;
  };
};

export type Action =
  | {
      type: 'CLEAR_ALL_NOTIFICATIONS';
    }
  | {
      type: 'SET_ACTIVE_NOTIFICATIONS';
      payload: {
        notifications: Array<Notification>;
        client: null | string;
        pluginId: string;
      };
    }
  | {
      type: 'UPDATE_PLUGIN_BLACKLIST';
      payload: Array<string>;
    }
  | {
      type: 'UPDATE_CATEGORY_BLACKLIST';
      payload: Array<string>;
    }
  | {
      type: 'ADD_NOTIFICATION';
      payload: PluginNotification;
    };

const INITIAL_STATE: State = {
  activeNotifications: [],
  invalidatedNotifications: [],
  blacklistedPlugins: [],
  blacklistedCategories: [],
  clearedNotifications: new Set(),
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  switch (action.type) {
    case 'SET_ACTIVE_NOTIFICATIONS': {
      return activeNotificationsReducer(state, action);
    }
    case 'CLEAR_ALL_NOTIFICATIONS':
      const markAsCleared = ({
        pluginId,
        notification: {id},
      }: PluginNotification) =>
        state.clearedNotifications.add(`${pluginId}#${id}`);

      state.activeNotifications.forEach(markAsCleared);
      state.invalidatedNotifications.forEach(markAsCleared);
      // Q: Should this actually delete them, or just invalidate them?
      return {
        ...state,
        activeNotifications: [],
        invalidatedNotifications: [],
      };
    case 'UPDATE_PLUGIN_BLACKLIST':
      return {
        ...state,
        blacklistedPlugins: action.payload,
      };
    case 'UPDATE_CATEGORY_BLACKLIST':
      return {
        ...state,
        blacklistedCategories: action.payload,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        // while adding notifications, remove old duplicates
        activeNotifications: [
          ...state.activeNotifications.filter(
            (notif) =>
              notif.client !== action.payload.client ||
              notif.pluginId !== action.payload.pluginId ||
              notif.notification.id !== action.payload.notification.id,
          ),
          action.payload,
        ],
      };
    default:
      return state;
  }
}

function activeNotificationsReducer(
  state: State,
  action: ActiveNotificationsAction,
): State {
  const {payload} = action;
  const newActiveNotifications = [];
  const newInactivatedNotifications = state.invalidatedNotifications;

  const newIDs = new Set(payload.notifications.map((n: Notification) => n.id));

  for (const activeNotification of state.activeNotifications) {
    if (activeNotification.pluginId !== payload.pluginId) {
      newActiveNotifications.push(activeNotification);
      continue;
    }

    if (!newIDs.has(activeNotification.notification.id)) {
      newInactivatedNotifications.push(activeNotification);
    }
  }

  payload.notifications
    .filter(
      ({id}: Notification) =>
        !state.clearedNotifications.has(`${payload.pluginId}#${id}`),
    )
    .forEach((notification: Notification) => {
      newActiveNotifications.push({
        pluginId: payload.pluginId,
        client: payload.client,
        notification,
      });
    });

  return {
    ...state,
    activeNotifications: newActiveNotifications,
    invalidatedNotifications: newInactivatedNotifications,
  };
}

export function addNotification(payload: PluginNotification): Action {
  return {
    type: 'ADD_NOTIFICATION',
    payload,
  };
}

export function addErrorNotification(
  title: string,
  message: string,
  error?: any,
): Action {
  // TODO: use this method for https://github.com/facebook/flipper/pull/1478/files as well
  console.error(title, message, error);
  return addNotification({
    client: null,
    pluginId: 'globalError',
    notification: {
      id: title,
      title,
      message: error ? message + ' ' + getStringFromErrorLike(error) : message,
      severity: 'error',
    },
  });
}

export function setActiveNotifications(payload: {
  notifications: Array<Notification>;
  client: null | string;
  pluginId: string;
}): Action {
  return {
    type: 'SET_ACTIVE_NOTIFICATIONS',
    payload,
  };
}

export function clearAllNotifications(): Action {
  return {
    type: 'CLEAR_ALL_NOTIFICATIONS',
  };
}

export function updatePluginBlacklist(payload: Array<string>): Action {
  return {
    type: 'UPDATE_PLUGIN_BLACKLIST',
    payload,
  };
}

export function updateCategoryBlacklist(payload: Array<string>): Action {
  return {
    type: 'UPDATE_CATEGORY_BLACKLIST',
    payload,
  };
}
