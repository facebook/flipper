/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {InstalledPluginDetails, Logger} from 'flipper-common';
import {Store} from '../reducers';
import {loadPlugin} from '../reducers/pluginManager';
import {sideEffect} from '../utils/sideEffect';

export default (store: Store, _logger: Logger) => {
  sideEffect(
    store,
    {
      name: 'pluginsSourceUpdateListener',
      throttleMs: 10,
      fireImmediately: true,
    },
    () => undefined,
    (_state, _store) => {
      window.addEventListener('message', (event) => {
        if (
          typeof event.data === 'object' &&
          event.data.type === 'plugins-source-updated' &&
          Array.isArray(event.data.data)
        ) {
          const changedPlugins = event.data.data as InstalledPluginDetails[];
          for (const plugin of changedPlugins) {
            store.dispatch(
              loadPlugin({
                plugin,
                enable: false,
                notifyIfFailed: true,
              }),
            );
          }
        }
      });
    },
  );
};
