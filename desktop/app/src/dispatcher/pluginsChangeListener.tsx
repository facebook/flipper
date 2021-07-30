/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Client from '../Client';
import {Logger} from '../fb-interfaces/Logger';
import {Store} from '../reducers';
import {appPluginListChanged} from '../reducers/connections';
import {getActiveClient} from '../selectors/connections';
import {sideEffect} from '../utils/sideEffect';

export default (store: Store, _logger: Logger) => {
  let prevClient: null | Client = null;

  const onActiveAppPluginListChanged = () => {
    store.dispatch(appPluginListChanged());
  };

  sideEffect(
    store,
    {name: 'pluginsChangeListener', throttleMs: 100, fireImmediately: true},
    getActiveClient,
    (activeClient, _store) => {
      if (activeClient !== prevClient) {
        if (prevClient) {
          prevClient.off('plugins-change', onActiveAppPluginListChanged);
        }
        prevClient = activeClient;
        if (prevClient) {
          prevClient.on('plugins-change', onActiveAppPluginListChanged);
        }
      }
    },
  );
};
