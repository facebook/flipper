/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DownloadablePluginDetails} from 'flipper-common';
import {State, Store} from '../reducers/index';
import {
  PluginDownloadStatus,
  pluginDownloadStarted,
  pluginDownloadFinished,
} from '../reducers/pluginDownloads';
import {sideEffect} from '../utils/sideEffect';
import {reportPlatformFailures, reportUsage} from 'flipper-common';
import {loadPlugin} from '../reducers/pluginManager';
import {showErrorNotification} from '../utils/notifications';
import {pluginInstalled} from '../reducers/plugins';
import {getAllClients} from '../reducers/connections';
import {getFlipperServer} from '../flipperServer';

export default (store: Store) => {
  sideEffect(
    store,
    {name: 'handlePluginDownloads', throttleMs: 1000, fireImmediately: true},
    (state) => state.pluginDownloads,
    (state, store) => {
      for (const download of Object.values(state)) {
        if (download.status === PluginDownloadStatus.QUEUED) {
          reportUsage(
            'plugin-auto-update:download',
            {
              version: download.plugin.version,
              startedByUser: download.startedByUser ? '1' : '0',
            },
            download.plugin.id,
          );
          reportPlatformFailures(
            handlePluginDownload(
              download.plugin,
              download.startedByUser,
              store,
            ),
            'plugin-auto-update:download',
          ).catch(() => {});
        }
      }
    },
  );
  return async () => {};
};

async function handlePluginDownload(
  plugin: DownloadablePluginDetails,
  startedByUser: boolean,
  store: Store,
) {
  const {title, version} = plugin;
  const downloadUrls = plugin.downloadUrls.join(', ');
  const dispatch = store.dispatch;
  console.log(
    `Downloading plugin "${title}" v${version} from "${downloadUrls}".`,
  );
  try {
    dispatch(pluginDownloadStarted({plugin}));
    const installedPlugin = await getFlipperServer().exec(
      'plugin-start-download',
      plugin,
    );
    dispatch(pluginInstalled(installedPlugin));
    if (pluginIsDisabledForAllConnectedClients(store.getState(), plugin)) {
      dispatch(
        loadPlugin({
          plugin: installedPlugin,
          enable: startedByUser,
          notifyIfFailed: startedByUser,
        }),
      );
    }
    console.log(
      `Successfully downloaded and installed plugin "${title}" v${version} from "${downloadUrls}".`,
    );
  } catch (error) {
    console.warn(
      `Failed to download plugin "${title}" v${version} from "${downloadUrls}".`,
      error,
    );
    if (startedByUser) {
      showErrorNotification(
        `Failed to download plugin "${title}" v${version}.`,
        'Please check that you are on VPN/Lighthouse and that you are logged into Flipper.',
      );
    }
    throw error;
  } finally {
    dispatch(pluginDownloadFinished({plugin}));
  }
}

function pluginIsDisabledForAllConnectedClients(
  state: State,
  plugin: DownloadablePluginDetails,
) {
  return (
    !state.plugins.clientPlugins.has(plugin.id) ||
    !getAllClients(state.connections).some((c) =>
      state.connections.enabledPlugins[c.query.app]?.includes(plugin.id),
    )
  );
}
