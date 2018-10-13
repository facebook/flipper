/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {Notification} from '../plugin';

export type PluginNotification = {|
  notification: Notification,
  pluginId: string,
  client: ?string,
|};

export type State = {
  activeNotifications: Array<PluginNotification>,
  invalidatedNotifications: Array<PluginNotification>,
  blacklistedPlugins: Array<string>,
  clearedNotifications: Set<string>,
};

type ActiveNotificationsAction = {
  type: 'SET_ACTIVE_NOTIFICATIONS',
  payload: {
    notifications: Array<Notification>,
    client: ?string,
    pluginId: string,
  },
};

type ClearAllAction = {
  type: 'CLEAR_ALL_NOTIFICATIONS',
};

type UpdateBlacklistAction = {
  type: 'UPDATE_PLUGIN_BLACKLIST',
  payload: Array<string>,
};

export type Action =
  | ActiveNotificationsAction
  | ClearAllAction
  | UpdateBlacklistAction;

const INITIAL_STATE: State = {
  activeNotifications: [],
  invalidatedNotifications: [],
  blacklistedPlugins: [],
  clearedNotifications: new Set(),
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

export function setActiveNotifications(payload: {
  notifications: Array<Notification>,
  client: ?string,
  pluginId: string,
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

export function updatePluginBlacklist(
  payload: Array<string>,
): UpdateBlacklistAction {
  return {
    type: 'UPDATE_PLUGIN_BLACKLIST',
    payload,
  };
}
