/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DownloadablePluginDetails,
  getInstalledPluginDetails,
  getPluginVersionInstallationDir,
  InstalledPluginDetails,
  installPluginFromFile,
} from 'flipper-plugin-lib';
import {Actions, State, Store} from '../reducers/index';
import {
  PluginDownloadStatus,
  pluginDownloadStarted,
  pluginDownloadFinished,
} from '../reducers/pluginDownloads';
import {sideEffect} from '../utils/sideEffect';
import {default as axios} from 'axios';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import {promisify} from 'util';
import {requirePlugin} from './plugins';
import {registerPluginUpdate, selectPlugin} from '../reducers/connections';
import {Button} from 'antd';
import React from 'react';
import {reportPlatformFailures, reportUsage} from '../utils/metrics';
import {addNotification, removeNotification} from '../reducers/notifications';
import reloadFlipper from '../utils/reloadFlipper';
import {activatePlugin, pluginInstalled} from '../reducers/pluginManager';
import {Dispatch} from 'redux';
import {showErrorNotification} from '../utils/notifications';
import isSandyEnabled from '../utils/isSandyEnabled';

// Adapter which forces node.js implementation for axios instead of browser implementation
// used by default in Electron. Node.js implementation is better, because it
// supports streams which can be used for direct downloading to disk.
const axiosHttpAdapter = require('axios/lib/adapters/http'); // eslint-disable-line import/no-commonjs

const getTempDirName = promisify(tmp.dir) as (
  options?: tmp.DirOptions,
) => Promise<string>;

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
  const dispatch = store.dispatch;
  const {name, title, version, downloadUrl} = plugin;
  const installationDir = getPluginVersionInstallationDir(name, version);
  console.log(
    `Downloading plugin "${title}" v${version} from "${downloadUrl}" to "${installationDir}".`,
  );
  const tmpDir = await getTempDirName();
  const tmpFile = path.join(tmpDir, `${name}-${version}.tgz`);
  let installedPlugin: InstalledPluginDetails | undefined;
  try {
    const cancellationSource = axios.CancelToken.source();
    dispatch(
      pluginDownloadStarted({plugin, cancel: cancellationSource.cancel}),
    );
    if (await fs.pathExists(installationDir)) {
      console.log(
        `Using existing files instead of downloading plugin "${title}" v${version} from "${downloadUrl}" to "${installationDir}"`,
      );
      installedPlugin = await getInstalledPluginDetails(installationDir);
    } else {
      await fs.ensureDir(tmpDir);
      let percentCompleted = 0;
      const response = await axios.get(plugin.downloadUrl, {
        adapter: axiosHttpAdapter,
        cancelToken: cancellationSource.token,
        responseType: 'stream',
        onDownloadProgress: async (progressEvent) => {
          const newPercentCompleted = !progressEvent.total
            ? 0
            : Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (newPercentCompleted - percentCompleted >= 20) {
            percentCompleted = newPercentCompleted;
            console.log(
              `Downloading plugin "${title}" v${version} from "${downloadUrl}": ${percentCompleted}% completed (${progressEvent.loaded} from ${progressEvent.total})`,
            );
          }
        },
      });
      if (response.headers['content-type'] !== 'application/octet-stream') {
        throw new Error(
          `Unexpected content type ${response.headers['content-type']} received from ${plugin.downloadUrl}`,
        );
      }
      const responseStream = response.data as fs.ReadStream;
      const writeStream = responseStream.pipe(
        fs.createWriteStream(tmpFile, {autoClose: true}),
      );
      await new Promise((resolve, reject) =>
        writeStream.once('finish', resolve).once('error', reject),
      );
      installedPlugin = await installPluginFromFile(tmpFile);
      dispatch(pluginInstalled(installedPlugin));
    }
    if (pluginIsDisabledForAllConnectedClients(store.getState(), plugin)) {
      dispatch(
        activatePlugin({
          plugin: installedPlugin,
          enable: startedByUser,
          notifyIfFailed: startedByUser,
        }),
      );
    } else if (!isSandyEnabled()) {
      notifyAboutUpdatedPluginNonSandy(installedPlugin, store.dispatch);
    }
    console.log(
      `Successfully downloaded and installed plugin "${title}" v${version} from "${downloadUrl}" to "${installationDir}".`,
    );
  } catch (error) {
    console.error(
      `Failed to download plugin "${title}" v${version} from "${downloadUrl}" to "${installationDir}".`,
      error,
    );
    if (startedByUser) {
      showErrorNotification(
        `Failed to download plugin "${title}" v${version}.`,
      );
    }
    throw error;
  } finally {
    dispatch(pluginDownloadFinished({plugin}));
    await fs.remove(tmpDir);
  }
}

function pluginIsDisabledForAllConnectedClients(
  state: State,
  plugin: DownloadablePluginDetails,
) {
  return (
    !state.plugins.clientPlugins.has(plugin.id) ||
    !state.connections.clients.some((c) =>
      state.connections.userStarredPlugins[c.query.app]?.includes(plugin.id),
    )
  );
}

function notifyAboutUpdatedPluginNonSandy(
  plugin: InstalledPluginDetails,
  dispatch: Dispatch<Actions>,
) {
  const {name, version, title, id} = plugin;
  const reloadPluginAndRemoveNotification = () => {
    reportUsage('plugin-auto-update:notification:reloadClicked', undefined, id);
    dispatch(
      registerPluginUpdate({
        plugin: requirePlugin(plugin),
        enablePlugin: false,
      }),
    );
    dispatch(
      removeNotification({
        pluginId: 'plugin-auto-update',
        client: null,
        notificationId: `auto-update.${name}.${version}`,
      }),
    );
    dispatch(
      selectPlugin({
        selectedPlugin: id,
        deepLinkPayload: null,
      }),
    );
  };
  const reloadAll = () => {
    reportUsage('plugin-auto-update:notification:reloadAllClicked');
    reloadFlipper();
  };
  dispatch(
    addNotification({
      pluginId: 'plugin-auto-update',
      client: null,
      notification: {
        id: `auto-update.${name}.${version}`,
        title: `${title} ${version} is ready to install`,
        message: (
          <div>
            {title} {version} has been downloaded. Reload is required to apply
            the update.{' '}
            <Button onClick={reloadPluginAndRemoveNotification}>
              Reload Plugin
            </Button>
            <Button onClick={reloadAll}>Reload Flipper</Button>
          </div>
        ),
        severity: 'warning',
        timestamp: Date.now(),
        category: `Plugin Auto Update`,
      },
    }),
  );
}
