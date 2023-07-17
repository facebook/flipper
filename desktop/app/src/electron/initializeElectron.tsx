/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {
  _NuxManagerContext,
  _createNuxManager,
  _setGlobalInteractionReporter,
  _LoggerContext,
} from 'flipper-plugin';
// eslint-disable-next-line no-restricted-imports,flipper/no-electron-remote-imports
import {ipcRenderer, SaveDialogReturnValue, clipboard, shell} from 'electron';
import fs from 'fs';
import {setupMenuBarTracking} from './setupMenuBar';
import {FlipperServer, FlipperServerConfig} from 'flipper-common';
import type {Icon, RenderHost} from 'flipper-ui-core';
import {getLocalIconUrl} from '../utils/icons';
import {getCPUUsage} from 'process';
import {ElectronIpcClientRenderer} from '../electronIpc';

export async function initializeElectron(
  flipperServer: FlipperServer,
  flipperServerConfig: FlipperServerConfig,
  electronIpcClient: ElectronIpcClientRenderer,
) {
  const [electronProcess, electronTheme] = await Promise.all([
    electronIpcClient.send('getProcess'),
    electronIpcClient.send('getNativeTheme'),
  ]);

  const execPath = process.execPath || electronProcess.execPath;
  const isProduction = !/node_modules[\\/]electron[\\/]/.test(execPath);

  setupMenuBarTracking(electronIpcClient);

  function restart(update: boolean = false) {
    if (isProduction) {
      if (update) {
        const options = {
          args: process.argv
            .splice(0, 1)
            .filter((arg) => arg !== '--no-launcher' && arg !== '--no-updater'),
        };
        electronIpcClient.send('relaunch', options);
      } else {
        electronIpcClient.send('relaunch');
      }
      electronIpcClient.send('exit');
    } else {
      // Relaunching the process with the standard way doesn't work in dev mode.
      // So instead we're sending a signal to dev server to kill the current instance of electron and launch new.
      fetch(`${flipperServerConfig.env.DEV_SERVER_URL}/_restartElectron`, {
        method: 'POST',
      });
    }
  }

  FlipperRenderHostInstance = {
    processId: electronProcess.pid,
    isProduction,
    readTextFromClipboard() {
      return Promise.resolve(clipboard.readText());
    },
    writeTextToClipboard(text: string) {
      clipboard.writeText(text);
    },
    async showSaveDialog(options) {
      return (await electronIpcClient.send('showSaveDialog', options))
        ?.filePath;
    },
    async showOpenDialog({filter, defaultPath}) {
      const result = await electronIpcClient.send('showOpenDialog', {
        defaultPath,
        properties: ['openFile'],
        filters: filter ? [filter] : undefined,
      });
      return result.filePaths?.[0];
    },
    showSelectDirectoryDialog(defaultPath = path.resolve('/')) {
      return electronIpcClient
        .send('showOpenDialog', {
          properties: ['openDirectory'],
          defaultPath,
        })
        .then((result: SaveDialogReturnValue & {filePaths: string[]}) => {
          if (result.filePath) {
            return result.filePath.toString();
          }
          // Electron typings seem of here, just in case,
          // (can be tested with settings dialog)
          // handle both situations
          if (result.filePaths) {
            return result.filePaths[0];
          }
          return undefined;
        });
    },
    importFile: (async ({
      defaultPath,
      extensions,
      title,
      encoding = 'utf-8',
      multi,
    } = {}) => {
      let {filePaths} = await electronIpcClient.send('showOpenDialog', {
        defaultPath,
        properties: [
          'openFile',
          ...(multi ? (['multiSelections'] as const) : []),
        ],
        filters: extensions ? [{extensions, name: ''}] : undefined,
        title,
      });

      if (!filePaths.length) {
        return;
      }

      if (!multi) {
        filePaths = [filePaths[0]];
      }

      const descriptors = await Promise.all(
        filePaths.map(async (filePath) => {
          const fileName = path.basename(filePath);

          const data = await fs.promises.readFile(filePath, {encoding});
          return {
            data,
            name: fileName,
            path: filePath,
          };
        }),
      );

      return multi ? descriptors : descriptors[0];
    }) as RenderHost['importFile'],
    async exportFile(data, {defaultPath, encoding = 'utf-8'} = {}) {
      const {filePath} = await electronIpcClient.send('showSaveDialog', {
        defaultPath,
      });

      if (!filePath) {
        return;
      }

      await fs.promises.writeFile(filePath, data, {encoding});
      return filePath;
    },
    async exportFileBinary(data, {defaultPath} = {}) {
      const {filePath} = await electronIpcClient.send('showSaveDialog', {
        defaultPath,
      });

      if (!filePath) {
        return;
      }

      await fs.promises.writeFile(filePath, data, {encoding: 'binary'});
      return filePath;
    },
    openLink(url: string) {
      shell.openExternal(url);
    },
    hasFocus() {
      // eslint-disable-next-line node/no-sync
      return electronIpcClient.sendSync('getCurrentWindowState').isFocused;
    },
    onIpcEvent(event, callback) {
      ipcRenderer.on(event, (_ev, ...args: any[]) => {
        callback(...(args as any));
      });
    },
    sendIpcEvent(event, ...args: any[]) {
      ipcRenderer.send(event, ...args);
    },
    shouldUseDarkColors() {
      return electronTheme.shouldUseDarkColors;
    },
    restartFlipper(update: boolean = false) {
      restart(update);
    },
    serverConfig: flipperServerConfig,
    GK(gatekeeper) {
      return flipperServerConfig.gatekeepers[gatekeeper] ?? false;
    },
    flipperServer,
    async requirePlugin(path): Promise<{plugin: any; css?: string}> {
      const plugin = electronRequire(path);
      /**
       * Check if the plugin includes a bundled css. If so,
       * load its content too.
       */
      const idx = path.lastIndexOf('.');
      const cssPath = path.substring(0, idx < 0 ? path.length : idx) + '.css';
      try {
        await fs.promises.access(cssPath);

        const buffer = await fs.promises.readFile(cssPath, {encoding: 'utf-8'});
        const css = buffer.toString();

        return {plugin, css};
      } catch (e) {}

      return {plugin};
    },
    getStaticResourceUrl(relativePath): string {
      return (
        'file://' +
        path.resolve(flipperServerConfig.paths.staticPath, relativePath)
      );
    },
    getLocalIconUrl(icon: Icon, url: string): string {
      return getLocalIconUrl(
        icon,
        url,
        flipperServerConfig.paths.staticPath,
        !flipperServerConfig.environmentInfo.isProduction,
      );
    },
    unloadModule(path: string) {
      const resolvedPath = electronRequire.resolve(path);
      if (!resolvedPath || !electronRequire.cache[resolvedPath]) {
        return;
      }
      delete electronRequire.cache[resolvedPath];
    },
    getPercentCPUUsage() {
      return getCPUUsage().percentCPUUsage;
    },
  } as RenderHost;
}
