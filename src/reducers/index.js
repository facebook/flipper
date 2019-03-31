/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {combineReducers} from 'redux';
import application from './application.js';
import connections from './connections.js';
import pluginStates from './pluginStates.js';
import notifications from './notifications.js';
import plugins from './plugins.js';
import user from './user.js';

import {persistReducer} from 'redux-persist';
import storage from 'redux-persist/lib/storage/index.js';

import type {
  State as ApplicationState,
  Action as ApplicationAction,
} from './application.js';
import type {
  State as DevicesState,
  Action as DevicesAction,
} from './connections.js';
import type {
  State as PluginStatesState,
  Action as PluginStatesAction,
} from './pluginStates.js';
import type {
  State as NotificationsState,
  Action as NotificationsAction,
} from './notifications.js';
import type {
  State as PluginsState,
  Action as PluginsAction,
} from './plugins.js';
import type {State as UserState, Action as UserAction} from './user.js';
import type {
  Store as ReduxStore,
  MiddlewareAPI as ReduxMiddlewareAPI,
} from 'redux';

type Actions =
  | ApplicationAction
  | DevicesAction
  | PluginStatesAction
  | NotificationsAction
  | PluginsAction
  | UserAction
  | {|type: 'INIT'|};

export type State = {|
  application: ApplicationState,
  connections: DevicesState,
  pluginStates: PluginStatesState,
  notifications: NotificationsState,
  plugins: PluginsState,
  user: UserState,
|};

export type Store = ReduxStore<State, Actions>;
export type MiddlewareAPI = ReduxMiddlewareAPI<State, Actions>;

export default combineReducers<_, Actions>({
  application,
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
