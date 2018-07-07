/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {combineReducers} from 'redux';
import application from './application.js';
import connections from './connections.js';
import server from './server.js';
import pluginStates from './pluginStates.js';
import type {
  State as ApplicationState,
  Action as ApplicationAction,
} from './application.js';
import type {
  State as DevicesState,
  Action as DevicesAction,
} from './connections.js';
import type {
  State as PluginsState,
  Action as PluginsAction,
} from './pluginStates.js';
import type {State as ServerState, Action as ServerAction} from './server.js';
import type {Store as ReduxStore} from 'redux';

export type Store = ReduxStore<
  {
    application: ApplicationState,
    connections: DevicesState,
    pluginStates: PluginsState,
    server: ServerState,
  },
  ApplicationAction | DevicesAction | PluginsAction | ServerAction,
>;

export default combineReducers({
  application,
  connections,
  pluginStates,
  server,
});
