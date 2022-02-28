/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import {promisify} from 'util';
import {default as axios} from 'axios';
import {
  BundledPluginDetails,
  DownloadablePluginDetails,
  ExecuteMessage,
  InstalledPluginDetails,
} from 'flipper-common';
import {getStaticPath} from '../utils/pathUtils';
import {loadDynamicPlugins} from './loadDynamicPlugins';
import {
  cleanupOldInstalledPluginVersions,
  getInstalledPluginDetails,
  getInstalledPlugins,
  getPluginVersionInstallationDir,
  installPluginFromFile,
  removePlugins,
  getUpdatablePlugins,
  getInstalledPlugin,
  installPluginFromNpm,
} from 'flipper-plugin-lib';
import {ServerAddOn} from './ServerAddOn';

const maxInstalledPluginVersionsToKeep = 2;

// Adapter which forces node.js implementation for axios instead of browser implementation
// used by default in Electron. Node.js implementation is better, because it
// supports streams which can be used for direct downloading to disk.
const axiosHttpAdapter = require('axios/lib/adapters/http'); // eslint-disable-line import/no-commonjs

const getTempDirName = promisify(tmp.dir) as (
  options?: tmp.DirOptions,
) => Promise<string>;

const isExecuteMessage = (message: object): message is ExecuteMessage =>
  (message as ExecuteMessage).method === 'execute';

export class PluginManager {
  private readonly serverAddOns = new Map<string, ServerAddOn>();

  async start() {
    // This needn't happen immediately and is (light) I/O work.
    setTimeout(() => {
      cleanupOldInstalledPluginVersions(maxInstalledPluginVersionsToKeep).catch(
        (err) =>
          console.error('Failed to clean up old installed plugins:', err),
      );
    }, 100);
  }

  loadDynamicPlugins = loadDynamicPlugins;
  getInstalledPlugins = getInstalledPlugins;
  removePlugins = removePlugins;
  getUpdatablePlugins = getUpdatablePlugins;
  getInstalledPlugin = getInstalledPlugin;
  installPluginFromFile = installPluginFromFile;
  installPluginFromNpm = installPluginFromNpm;

  async loadSource(path: string) {
    return await fs.readFile(path, 'utf8');
  }

  async getBundledPlugins(): Promise<Array<BundledPluginDetails>> {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.FLIPPER_NO_BUNDLED_PLUGINS === 'true'
    ) {
      return [];
    }
    // defaultPlugins that are included in the Flipper distributive.
    // List of default bundled plugins is written at build time to defaultPlugins/bundled.json.
    const pluginPath = getStaticPath(
      path.join('defaultPlugins', 'bundled.json'),
      {asarUnpacked: true},
    );
    let bundledPlugins: Array<BundledPluginDetails> = [];
    try {
      bundledPlugins = await fs.readJson(pluginPath);
    } catch (e) {
      console.error('Failed to load list of bundled plugins', e);
    }
    return bundledPlugins;
  }

  async downloadPlugin(
    plugin: DownloadablePluginDetails,
  ): Promise<InstalledPluginDetails> {
    const {name, title, version, downloadUrl} = plugin;
    const installationDir = getPluginVersionInstallationDir(name, version);
    console.log(
      `Downloading plugin "${title}" v${version} from "${downloadUrl}" to "${installationDir}".`,
    );
    const tmpDir = await getTempDirName();
    const tmpFile = path.join(tmpDir, `${name}-${version}.tgz`);
    try {
      const cancelationSource = axios.CancelToken.source();
      if (await fs.pathExists(installationDir)) {
        console.log(
          `Using existing files instead of downloading plugin "${title}" v${version} from "${downloadUrl}" to "${installationDir}"`,
        );
        return await getInstalledPluginDetails(installationDir);
      } else {
        await fs.ensureDir(tmpDir);
        let percentCompleted = 0;
        const response = await axios.get(plugin.downloadUrl, {
          adapter: axiosHttpAdapter,
          cancelToken: cancelationSource.token,
          responseType: 'stream',
          headers: {
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
          },
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
            `It looks like you are not on VPN/Lighthouse. Unexpected content type received: ${response.headers['content-type']}.`,
          );
        }
        const responseStream = response.data as fs.ReadStream;
        const writeStream = responseStream.pipe(
          fs.createWriteStream(tmpFile, {autoClose: true}),
        );
        await new Promise((resolve, reject) =>
          writeStream.once('finish', resolve).once('error', reject),
        );
        return await installPluginFromFile(tmpFile);
      }
    } catch (error) {
      console.error(
        `Failed to download plugin "${title}" v${version} from "${downloadUrl}" to "${installationDir}".`,
        error,
      );
      throw error;
    } finally {
      await fs.remove(tmpDir);
    }
  }

  getServerAddOnForMessage(message: object) {
    if (!isExecuteMessage(message)) {
      throw new Error(
        `PluginManager.getServerAddOnForMessage supports only "execute" messages. Received ${JSON.stringify(
          message,
        )}`,
      );
    }
    return this.serverAddOns.get(message.params.api);
  }

  async startServerAddOn(pluginName: string, owner: string) {
    console.debug('PluginManager.startServerAddOn', pluginName);
    const existingServerAddOn = this.serverAddOns.get(pluginName);
    if (existingServerAddOn) {
      console.debug(
        'PluginManager.startServerAddOn -> already started, adding an owner',
        pluginName,
        owner,
      );
      existingServerAddOn.addOwner(owner);
      return;
    }

    const newServerAddOn = await ServerAddOn.start(pluginName, owner, () =>
      this.serverAddOns.delete(pluginName),
    );
    this.serverAddOns.set(pluginName, newServerAddOn);
  }

  stopServerAddOn(pluginName: string, owner: string) {
    console.debug('PluginManager.stopServerAddOn', pluginName);
    const serverAddOn = this.serverAddOns.get(pluginName);
    if (!serverAddOn) {
      console.debug('PluginManager.stopServerAddOn -> not started', pluginName);
      return;
    }
    serverAddOn.removeOwner(owner);
  }

  stopAllServerAddOns(owner: string) {
    console.debug('PluginManager.stopAllServerAddOns');
    this.serverAddOns.forEach((serverAddOn) => {
      serverAddOn.removeOwner(owner);
    });
  }
}
