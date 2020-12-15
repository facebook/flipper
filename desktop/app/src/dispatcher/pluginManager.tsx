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
  pluginFilesRemoved,
  registerInstalledPlugins,
} from '../reducers/pluginManager';
import {
  getInstalledPlugins,
  cleanupOldInstalledPluginVersions,
  removePlugin,
} from 'flipper-plugin-lib';
import {sideEffect} from '../utils/sideEffect';
import pMap from 'p-map';

const maxInstalledPluginVersionsToKeep = 2;

function refreshInstalledPlugins(store: Store) {
  cleanupOldInstalledPluginVersions(maxInstalledPluginVersionsToKeep)
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
    {
      name: 'removeUninstalledPluginFiles',
      throttleMs: 1000,
      fireImmediately: true,
    },
    (state) => state.pluginManager.removedPlugins,
    (removedPlugins) => {
      pMap(removedPlugins, (p) => {
        removePlugin(p.name)
          .then(() => pluginFilesRemoved(p))
          .catch((e) =>
            console.error(
              `Error while removing files of uninstalled plugin ${p.title}`,
              e,
            ),
          );
      }).then(() => refreshInstalledPlugins(store));
    },
  );
};
