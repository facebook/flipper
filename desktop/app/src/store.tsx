/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createStore} from 'redux';
import reducers, {Actions, State as StoreState} from './reducers/index';
import {stateSanitizer} from './utils/reduxDevToolsConfig';
import isProduction from './utils/isProduction';
import produce from 'immer';
import {
  defaultEnabledBackgroundPlugins,
  getPluginKey,
} from './utils/pluginUtils';

export const store = createStore<StoreState, Actions, any, any>(
  rootReducer,
  // @ts-ignore Type definition mismatch
  window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.__REDUX_DEVTOOLS_EXTENSION__({
        // @ts-ignore: stateSanitizer is not part of type definition.
        stateSanitizer,
      })
    : undefined,
);

export function rootReducer(
  state: StoreState | undefined,
  action: Actions,
): StoreState {
  if (action.type === 'STAR_PLUGIN' && state) {
    const {plugin, selectedApp} = action.payload;
    const selectedPlugin = plugin.id;
    const clients = state.connections.clients.filter(
      (client) => client.query.app === selectedApp,
    );
    return produce(state, (draft) => {
      if (!draft.connections.userStarredPlugins[selectedApp]) {
        draft.connections.userStarredPlugins[selectedApp] = [];
      }
      const plugins = draft.connections.userStarredPlugins[selectedApp];
      const idx = plugins.indexOf(selectedPlugin);
      if (idx === -1) {
        plugins.push(selectedPlugin);
        // enabling a plugin on one device enables it on all...
        clients.forEach((client) => {
          // sandy plugin? initialize it
          client.startPluginIfNeeded(plugin, true);
          // background plugin? connect it needed
          if (
            !defaultEnabledBackgroundPlugins.includes(selectedPlugin) &&
            client?.isBackgroundPlugin(selectedPlugin)
          ) {
            client.initPlugin(selectedPlugin);
          }
        });
      } else {
        plugins.splice(idx, 1);
        // enabling a plugin on one device disables it on all...
        clients.forEach((client) => {
          // disconnect background plugins
          if (
            !defaultEnabledBackgroundPlugins.includes(selectedPlugin) &&
            client?.isBackgroundPlugin(selectedPlugin)
          ) {
            client.deinitPlugin(selectedPlugin);
          }
          // stop sandy plugins
          client.stopPluginIfNeeded(plugin.id);
          delete draft.pluginMessageQueue[
            getPluginKey(client.id, {serial: client.query.device_id}, plugin.id)
          ];
        });
      }
    });
  }

  // otherwise
  return reducers(state, action);
}

if (!isProduction()) {
  // For debugging purposes only
  // @ts-ignore
  window.flipperStore = store;
}
