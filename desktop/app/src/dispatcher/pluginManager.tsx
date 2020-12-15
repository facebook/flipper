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
  pluginActivationHandled,
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
import {reportUsage} from '../utils/metrics';

const maxInstalledPluginVersionsToKeep = 2;

function refreshInstalledPlugins(store: Store) {
  removePlugins(store.getState().pluginManager.uninstalledPlugins.values())
    .then(() =>
      cleanupOldInstalledPluginVersions(maxInstalledPluginVersionsToKeep),
    )
    .then(() => getInstalledPlugins())
    .then((plugins) => store.dispatch(registerInstalledPlugins(plugins)));
}

export default (store: Store, _logger: Logger) => {
  // This needn't happen immediately and is (light) I/O work.
  window.requestIdleCallback(() => {
    refreshInstalledPlugins(store);
  });

  sideEffect(
    store,
    {name: 'handlePluginActivation', throttleMs: 1000, fireImmediately: true},
    (state) => state.pluginManager.pluginActivationQueue,
    (queue, store) => {
      for (const request of queue) {
        try {
          reportUsage(
            'plugin:activate',
            {
              version: request.plugin.version,
              enable: request.enable ? '1' : '0',
              notifyIfFailed: request.notifyIfFailed ? '1' : '0',
            },
            request.plugin.id,
          );
          const plugin = requirePlugin(request.plugin);
          const enablePlugin = request.enable;
          store.dispatch(
            registerPluginUpdate({
              plugin,
              enablePlugin,
            }),
          );
        } catch (err) {
          console.error(
            `Failed to activate plugin ${request.plugin.title} v${request.plugin.version}`,
            err,
          );
          if (request.notifyIfFailed) {
            showErrorNotification(
              `Failed to load plugin "${request.plugin.title}" v${request.plugin.version}`,
            );
          }
        }
      }
      store.dispatch(pluginActivationHandled(queue.length));
    },
  );
};
