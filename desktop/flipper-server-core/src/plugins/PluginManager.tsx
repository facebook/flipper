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
  FlipperServerForServerAddOn,
  InstalledPluginDetails,
  ServerAddOnStartDetails,
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
import {ServerAddOnManager} from './ServerAddManager';

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
  public readonly serverAddOns = new Map<string, ServerAddOnManager>();

  constructor(private readonly flipperServer: FlipperServerForServerAddOn) {}

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
        function parseHeaderValue(header: string) {
          const values = header.split(';');
          // remove white space
          return values.map((value) => value.trim());
        }

        if (
          !parseHeaderValue(response.headers['content-type']).includes(
            'application/octet-stream',
          )
        ) {
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

  async startServerAddOn(
    pluginName: string,
    details: ServerAddOnStartDetails,
    owner: string,
  ): Promise<void> {
    console.debug('PluginManager.startServerAddOn', pluginName);
    const existingServerAddOn = this.serverAddOns.get(pluginName);

    if (existingServerAddOn) {
      if (existingServerAddOn.state.is('stopping')) {
        console.debug(
          'PluginManager.startServerAddOn -> currently stropping',
          pluginName,
          owner,
          existingServerAddOn.state.currentState,
        );
        await existingServerAddOn.state.wait(['inactive', 'zombie']);
        return this.startServerAddOn(pluginName, details, owner);
      }

      console.debug(
        'PluginManager.startServerAddOn -> already started',
        pluginName,
        owner,
        existingServerAddOn.state.currentState,
      );
      await existingServerAddOn.addOwner(owner);
      return;
    }

    const newServerAddOn = new ServerAddOnManager(
      pluginName,
      details,
      owner,
      this.flipperServer,
    );
    this.serverAddOns.set(pluginName, newServerAddOn);

    newServerAddOn.state.once(['fatal', 'zombie', 'inactive'], () => {
      this.serverAddOns.delete(pluginName);
    });

    await newServerAddOn.state.wait(['active', 'fatal']);

    if (newServerAddOn.state.is('fatal')) {
      this.serverAddOns.delete(pluginName);
      throw newServerAddOn.state.error;
    }
  }

  async stopServerAddOn(pluginName: string, owner: string): Promise<void> {
    console.debug('PluginManager.stopServerAddOn', pluginName);
    const serverAddOn = this.serverAddOns.get(pluginName);

    if (!serverAddOn) {
      console.warn('PluginManager.stopServerAddOn -> not started', pluginName);
      return;
    }

    try {
      await serverAddOn.removeOwner(owner);
    } catch (e) {
      console.error(
        'PluginManager.stopServerAddOn -> error',
        pluginName,
        owner,
        e,
      );
      this.serverAddOns.delete(pluginName);
      throw e;
    }
  }

  stopAllServerAddOns(owner: string) {
    console.debug('PluginManager.stopAllServerAddOns', owner);
    this.serverAddOns.forEach(async (serverAddOnPromise) => {
      try {
        const serverAddOn = await serverAddOnPromise;
        serverAddOn.removeOwner(owner);
      } catch (e) {
        // It is OK to use a debug level here because any failure would be logged in "stopServerAddOn"
        console.debug(
          'PluginManager.stopAllServerAddOns -> failed to remove owner',
          owner,
          e,
        );
      }
    });
  }
}
