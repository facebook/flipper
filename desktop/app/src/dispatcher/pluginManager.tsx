/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {
  LoadPluginActionPayload,
  pluginCommandsProcessed,
  registerInstalledPlugins,
} from '../reducers/pluginManager';
import {
  getInstalledPlugins,
  cleanupOldInstalledPluginVersions,
  removePlugins,
} from 'flipper-plugin-lib';
import {sideEffect} from '../utils/sideEffect';
import {requirePlugin} from './plugins';
import {registerPluginUpdate} from '../reducers/connections';
import {showErrorNotification} from '../utils/notifications';

const maxInstalledPluginVersionsToKeep = 2;

function refreshInstalledPlugins(store: Store) {
  removePlugins(store.getState().pluginManager.uninstalledPlugins.values())
    .then(() =>
      cleanupOldInstalledPluginVersions(maxInstalledPluginVersionsToKeep),
    )
    .then(() => getInstalledPlugins())
    .then((plugins) => store.dispatch(registerInstalledPlugins(plugins)));
}

export default (
  store: Store,
  _logger: Logger,
  {runSideEffectsSynchronously}: {runSideEffectsSynchronously: boolean} = {
    runSideEffectsSynchronously: false,
  },
) => {
  // This needn't happen immediately and is (light) I/O work.
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      refreshInstalledPlugins(store);
    });
  }

  const unsubscribeHandlePluginCommands = sideEffect(
    store,
    {
      name: 'handlePluginCommands',
      throttleMs: 0,
      fireImmediately: true,
      runSynchronously: runSideEffectsSynchronously, // Used to simplify writing tests, if "true" passed, the all side effects will be called synchronously and immediately after changes
      noTimeBudgetWarns: true, // These side effects are critical, so we're doing them with zero throttling and want to avoid unnecessary warns
    },
    (state) => state.pluginManager.pluginCommandsQueue,
    (queue, store) => {
      for (const command of queue) {
        switch (command.type) {
          case 'LOAD_PLUGIN':
            loadPlugin(store, command.payload);
            break;
          default:
            console.error('Unexpected plugin command', command);
            break;
        }
      }
      store.dispatch(pluginCommandsProcessed(queue.length));
    },
  );
  return async () => {
    unsubscribeHandlePluginCommands();
  };
};

function loadPlugin(store: Store, payload: LoadPluginActionPayload) {
  try {
    const plugin = requirePlugin(payload.plugin);
    const enablePlugin = payload.enable;
    store.dispatch(
      registerPluginUpdate({
        plugin,
        enablePlugin,
      }),
    );
  } catch (err) {
    console.error(
      `Failed to activate plugin ${payload.plugin.title} v${payload.plugin.version}`,
      err,
    );
    if (payload.notifyIfFailed) {
      showErrorNotification(
        `Failed to load plugin "${payload.plugin.title}" v${payload.plugin.version}`,
      );
    }
  }
}
