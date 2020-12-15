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
  installPluginFromFile,
} from 'flipper-plugin-lib';
import {Store} from '../reducers/index';
import {
  PluginDownloadStatus,
  pluginDownloadStarted,
  pluginDownloadFailed,
  pluginDownloadSucceeded,
} from '../reducers/pluginDownloads';
import {sideEffect} from '../utils/sideEffect';
import {default as axios} from 'axios';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import {promisify} from 'util';
import {requirePlugin} from './plugins';
import {registerPluginUpdate} from '../reducers/connections';

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
          handlePluginDownload(
            download.plugin,
            download.enableDownloadedPlugin,
            store,
          );
        }
      }
    },
  );
  return async () => {};
};

async function handlePluginDownload(
  plugin: DownloadablePluginDetails,
  enableDownloadedPlugin: boolean,
  store: Store,
) {
  const dispatch = store.dispatch;
  const {name, title, version, downloadUrl, dir} = plugin;
  console.log(
    `Downloading plugin "${title}" v${version} from "${downloadUrl}" to "${dir}".`,
  );
  const targetDir = await getTempDirName();
  const targetFile = path.join(targetDir, `${name}-${version}.tgz`);
  try {
    const cancellationSource = axios.CancelToken.source();
    dispatch(
      pluginDownloadStarted({plugin, cancel: cancellationSource.cancel}),
    );
    await fs.ensureDir(targetDir);
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
      fs.createWriteStream(targetFile, {autoClose: true}),
    );
    await new Promise((resolve, reject) =>
      writeStream.once('finish', resolve).once('error', reject),
    );
    await installPluginFromFile(targetFile);
    if (!store.getState().plugins.clientPlugins.has(plugin.id)) {
      const pluginDefinition = requirePlugin(plugin);
      dispatch(
        registerPluginUpdate({
          plugin: pluginDefinition,
          enablePlugin: enableDownloadedPlugin,
        }),
      );
    }
    console.log(
      `Successfully downloaded and installed plugin "${title}" v${version} from "${downloadUrl}" to "${dir}".`,
    );
    dispatch(pluginDownloadSucceeded({plugin}));
  } catch (error) {
    console.error(
      `Failed to download plugin "${title}" v${version} from "${downloadUrl}" to "${dir}".`,
      error,
    );
    dispatch(pluginDownloadFailed({plugin, error}));
  } finally {
    await fs.remove(targetDir);
  }
}
