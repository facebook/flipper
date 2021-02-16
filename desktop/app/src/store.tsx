/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createStore} from 'redux';
import reducers, {Actions, State as StoreState, Store} from './reducers/index';
import {stateSanitizer} from './utils/reduxDevToolsConfig';
import isProduction from './utils/isProduction';
import produce from 'immer';
import {
  defaultEnabledBackgroundPlugins,
  getPluginKey,
} from './utils/pluginUtils';
import Client from './Client';
import {PluginDefinition} from './plugin';
import {_SandyPluginDefinition} from 'flipper-plugin';
export const store: Store = createStore<StoreState, Actions, any, any>(
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
          startPlugin(client, plugin);
        });
      } else {
        plugins.splice(idx, 1);
        // enabling a plugin on one device disables it on all...
        clients.forEach((client) => {
          stopPlugin(client, plugin.id);
          const pluginKey = getPluginKey(
            client.id,
            {serial: client.query.device_id},
            plugin.id,
          );
          delete draft.pluginMessageQueue[pluginKey];
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

function stopPlugin(
  client: Client,
  pluginId: string,
  forceInitBackgroundPlugin: boolean = false,
): boolean {
  if (
    (forceInitBackgroundPlugin ||
      !defaultEnabledBackgroundPlugins.includes(pluginId)) &&
    client?.isBackgroundPlugin(pluginId)
  ) {
    client.deinitPlugin(pluginId);
  }
  // stop sandy plugins
  client.stopPluginIfNeeded(pluginId);
  return true;
}

function startPlugin(
  client: Client,
  plugin: PluginDefinition,
  forceInitBackgroundPlugin: boolean = false,
) {
  client.startPluginIfNeeded(plugin, true);
  // background plugin? connect it needed
  if (
    (forceInitBackgroundPlugin ||
      !defaultEnabledBackgroundPlugins.includes(plugin.id)) &&
    client?.isBackgroundPlugin(plugin.id)
  ) {
    client.initPlugin(plugin.id);
  }
}
