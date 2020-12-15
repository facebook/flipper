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
import {registerInstalledPlugins} from '../reducers/pluginManager';
import {
  getInstalledPlugins,
  cleanupOldInstalledPluginVersions,
  removePlugins,
} from 'flipper-plugin-lib';

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
};
