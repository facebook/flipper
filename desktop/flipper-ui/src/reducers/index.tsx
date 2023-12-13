/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
  persistMigrations as devicesPersistMigrations,
  persistVersion as devicesPersistVersion,
} from './connections';
import pluginMessageQueue, {
  State as PluginMessageQueueState,
  Action as PluginMessageQueueAction,
} from './pluginMessageQueue';
import notifications, {
  State as NotificationsState,
  Action as NotificationsAction,
} from './notifications';
import plugins, {
  State as PluginsState,
  Action as PluginsAction,
  persistMigrations as pluginsPersistMigrations,
  persistVersion as pluginsPersistVersion,
} from './plugins';
import settings, {Action as SettingsAction} from './settings';
import launcherSettings, {
  Action as LauncherSettingsAction,
} from './launcherSettings';
import pluginManager, {
  State as PluginManagerState,
  Action as PluginManagerAction,
} from './pluginManager';
import healthchecks, {
  Action as HealthcheckAction,
  State as HealthcheckState,
} from './healthchecks';
import pluginDownloads, {
  State as PluginDownloadsState,
  Action as PluginDownloadsAction,
} from './pluginDownloads';
import usageTracking, {
  Action as TrackingAction,
  State as TrackingState,
} from './usageTracking';
import user, {State as UserState, Action as UserAction} from './user';
import {createMigrate, createTransform, persistReducer} from 'redux-persist';
import {PersistPartial} from 'redux-persist/es/persistReducer';

import {Store as ReduxStore, MiddlewareAPI as ReduxMiddlewareAPI} from 'redux';
import storage from 'redux-persist/lib/storage';
import {TransformConfig} from 'redux-persist/es/createTransform';
import {LauncherSettings, Settings} from 'flipper-common';

export type Actions =
  | ApplicationAction
  | DevicesAction
  | PluginMessageQueueAction
  | NotificationsAction
  | PluginsAction
  | UserAction
  | SettingsAction
  | LauncherSettingsAction
  | PluginManagerAction
  | HealthcheckAction
  | TrackingAction
  | PluginDownloadsAction
  | {type: 'INIT'};

export type State = {
  application: ApplicationState;
  connections: DevicesState & PersistPartial;
  pluginMessageQueue: PluginMessageQueueState;
  notifications: NotificationsState & PersistPartial;
  plugins: PluginsState & PersistPartial;
  user: UserState & PersistPartial;
  settingsState: Settings;
  launcherSettingsState: LauncherSettings;
  pluginManager: PluginManagerState;
  healthchecks: HealthcheckState & PersistPartial;
  usageTracking: TrackingState;
  pluginDownloads: PluginDownloadsState;
};

export type Store = ReduxStore<State, Actions>;
export type MiddlewareAPI = ReduxMiddlewareAPI<Dispatch<Actions>, State>;

const setTransformer = (config: TransformConfig) =>
  createTransform(
    (set: Set<string>) => Array.from(set),
    (arrayString: string[]) => new Set(arrayString),
    config,
  );

export function createRootReducer() {
  return combineReducers<State, Actions>({
    application,
    connections: persistReducer<DevicesState, Actions>(
      {
        key: 'connections',
        storage,
        whitelist: [
          'userPreferredDevice',
          'userPreferredPlugin',
          'userPreferredApp',
          'enabledPlugins',
          'enabledDevicePlugins',
        ],
        transforms: [
          setTransformer({
            whitelist: ['enabledDevicePlugins', 'userStarredDevicePlugins'],
          }),
        ],
        version: devicesPersistVersion,
        migrate: createMigrate(devicesPersistMigrations),
      },
      connections,
    ),
    pluginMessageQueue: pluginMessageQueue as any,
    notifications: persistReducer(
      {
        key: 'notifications',
        storage,
        whitelist: ['blacklistedPlugins', 'blacklistedCategories'],
      },
      notifications,
    ),
    plugins: persistReducer<PluginsState, Actions>(
      {
        key: 'plugins',
        storage,
        whitelist: ['marketplacePlugins', 'uninstalledPluginNames'],
        transforms: [setTransformer({whitelist: ['uninstalledPluginNames']})],
        version: pluginsPersistVersion,
        migrate: createMigrate(pluginsPersistMigrations),
      },
      plugins,
    ),
    pluginManager,
    user: user as any,
    settingsState: settings,
    launcherSettingsState: launcherSettings,
    healthchecks: persistReducer<HealthcheckState, Actions>(
      {
        key: 'healthchecks',
        storage,
        whitelist: ['acknowledgedProblems'],
      },
      healthchecks,
    ),
    usageTracking,
    pluginDownloads,
  });
}
