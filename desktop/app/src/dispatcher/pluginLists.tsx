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
import {pluginListsChanged} from '../reducers/pluginLists';
import {computePluginLists} from '../utils/pluginUtils';
import {sideEffect} from '../utils/sideEffect';

export default (store: Store, _logger: Logger) => {
  const recomputePluginList = () => {
    store.dispatch(
      pluginListsChanged(
        computePluginLists(
          store.getState().connections,
          store.getState().plugins,
        ),
      ),
    );
  };

  let prevClient: null | Client = null;

  sideEffect(
    store,
    {name: 'computePluginLists', throttleMs: 100, fireImmediately: true},
    (state) => {
      const {
        activeClient,
        activeDevice,
        metroDevice,
        enabledDevicePlugins,
        enabledPlugins,
      } = state.connections;
      const {
        bundledPlugins,
        marketplacePlugins,
        loadedPlugins,
        devicePlugins,
        disabledPlugins,
        gatekeepedPlugins,
        failedPlugins,
        clientPlugins,
      } = state.plugins;
      return {
        activeClient,
        activeDevice,
        metroDevice,
        enabledDevicePlugins,
        enabledPlugins,
        bundledPlugins,
        marketplacePlugins,
        loadedPlugins,
        devicePlugins,
        disabledPlugins,
        gatekeepedPlugins,
        failedPlugins,
        clientPlugins,
      };
    },
    (
      {
        activeClient,
        activeDevice,
        metroDevice,
        enabledDevicePlugins,
        enabledPlugins,
        bundledPlugins,
        marketplacePlugins,
        loadedPlugins,
        devicePlugins,
        disabledPlugins,
        gatekeepedPlugins,
        failedPlugins,
        clientPlugins,
      },
      store,
    ) => {
      store.dispatch(
        pluginListsChanged(
          computePluginLists(
            {
              activeClient,
              activeDevice,
              metroDevice,
              enabledDevicePlugins,
              enabledPlugins,
            },
            {
              bundledPlugins,
              marketplacePlugins,
              loadedPlugins,
              devicePlugins,
              disabledPlugins,
              gatekeepedPlugins,
              failedPlugins,
              clientPlugins,
            },
          ),
        ),
      );
      if (activeClient !== prevClient) {
        if (prevClient) {
          prevClient.off('plugins-change', recomputePluginList);
        }
        prevClient = activeClient;
        if (prevClient) {
          prevClient.on('plugins-change', recomputePluginList);
        }
      }
    },
  );
};
