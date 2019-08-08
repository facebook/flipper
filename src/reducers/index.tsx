/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {combineReducers, Dispatch} from 'redux';
import application, {
  State as ApplicationState,
  Action as ApplicationAction,
} from './application';
import connections, {
  State as DevicesState,
  Action as DevicesAction,
} from './connections';
import pluginStates, {
  State as PluginStatesState,
  Action as PluginStatesAction,
} from './pluginStates';
import notifications, {
  State as NotificationsState,
  Action as NotificationsAction,
} from './notifications';
import plugins, {
  State as PluginsState,
  Action as PluginsAction,
} from './plugins';
import user, {State as UserState, Action as UserAction} from './user';

import {persistReducer} from 'redux-persist';
import storage from 'redux-persist/lib/storage/index.js';

import {Store as ReduxStore, MiddlewareAPI as ReduxMiddlewareAPI} from 'redux';

type Actions =
  | ApplicationAction
  | DevicesAction
  | PluginStatesAction
  | NotificationsAction
  | PluginsAction
  | UserAction
  | {type: 'INIT'};

export type State = {
  application: ApplicationState,
  connections: DevicesState,
  pluginStates: PluginStatesState,
  notifications: NotificationsState,
  plugins: PluginsState,
  user: UserState,
};

export type Store = ReduxStore<State, Actions>;
export type MiddlewareAPI = ReduxMiddlewareAPI<Dispatch<Actions>, State>;

export default combineReducers<State, Actions>({
  application: persistReducer(
    {
      key: 'application',
      storage,
      whitelist: ['flipperRating'],
    },
    application,
  ),
  connections: persistReducer(
    {
      key: 'connections',
      storage,
      whitelist: [
        'userPreferredDevice',
        'userPreferredPlugin',
        'userPreferredApp',
      ],
    },
    connections,
  ),
  pluginStates,
  notifications: persistReducer(
    {
      key: 'notifications',
      storage,
      whitelist: ['blacklistedPlugins', 'blacklistedCategories'],
    },
    notifications,
  ),
  plugins,
  user: persistReducer(
    {
      key: 'user',
      storage,
    },
    user,
  ),
});
