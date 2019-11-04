/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
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
import supportForm, {
  State as SupportFormState,
  Action as SupportFormAction,
} from './supportForm';
import settings, {
  Settings as SettingsState,
  Action as SettingsAction,
} from './settings';
import user, {State as UserState, Action as UserAction} from './user';
import JsonFileStorage from '../utils/jsonFileReduxPersistStorage';
import os from 'os';
import {resolve} from 'path';
import xdg from 'xdg-basedir';
import {persistReducer} from 'redux-persist';
import {PersistPartial} from 'redux-persist/es/persistReducer';

import {Store as ReduxStore, MiddlewareAPI as ReduxMiddlewareAPI} from 'redux';
// @ts-ignore: explicitly need to import index.js, otherwise index.native.js is imported, because redux-persist assumes we are react-native, because we are using metro-bundler
import storage from 'redux-persist/lib/storage/index.js';

export type Actions =
  | ApplicationAction
  | DevicesAction
  | PluginStatesAction
  | NotificationsAction
  | PluginsAction
  | UserAction
  | SettingsAction
  | SupportFormAction
  | {type: 'INIT'};

export type State = {
  application: ApplicationState & PersistPartial;
  connections: DevicesState & PersistPartial;
  pluginStates: PluginStatesState;
  notifications: NotificationsState & PersistPartial;
  plugins: PluginsState;
  user: UserState & PersistPartial;
  settingsState: SettingsState & PersistPartial;
  supportForm: SupportFormState;
};

export type Store = ReduxStore<State, Actions>;
export type MiddlewareAPI = ReduxMiddlewareAPI<Dispatch<Actions>, State>;

const settingsStorage = new JsonFileStorage(
  resolve(
    ...(xdg.config ? [xdg.config] : [os.homedir(), '.config']),
    'flipper',
    'settings.json',
  ),
);

export default combineReducers<State, Actions>({
  application: persistReducer<ApplicationState, Actions>(
    {
      key: 'application',
      storage,
      whitelist: ['flipperRating'],
    },
    application,
  ),
  connections: persistReducer<DevicesState, Actions>(
    {
      key: 'connections',
      storage,
      whitelist: [
        'userPreferredDevice',
        'userPreferredPlugin',
        'userPreferredApp',
        'userLRUPlugins',
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
  supportForm,
  user: persistReducer(
    {
      key: 'user',
      storage,
    },
    user,
  ),
  settingsState: persistReducer(
    {key: 'settings', storage: settingsStorage},
    settings,
  ),
});
