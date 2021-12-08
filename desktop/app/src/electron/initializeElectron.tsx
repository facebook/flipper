/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
import {
  ipcRenderer,
  remote,
  SaveDialogReturnValue,
  clipboard,
  shell,
} from 'electron';
import type {RenderHost} from 'flipper-ui-core';
import fs from 'fs';
import {setupMenuBar} from './setupMenuBar';
import {FlipperServer, FlipperServerConfig} from 'flipper-common';

declare global {
  interface Window {
    // We store this as a global, to make sure the renderHost is available
    // before flipper-ui-core is loaded and needs those during module initialisation
    FlipperRenderHostInstance: RenderHost;
  }
}

export function initializeElectron(
  flipperServer: FlipperServer,
  flipperServerConfig: FlipperServerConfig,
) {
  const execPath = process.execPath || remote.process.execPath;
  const isProduction = !/node_modules[\\/]electron[\\/]/.test(execPath);

  function restart(update: boolean = false) {
    if (isProduction) {
      if (update) {
        const options = {
          args: process.argv
            .splice(0, 1)
            .filter((arg) => arg !== '--no-launcher' && arg !== '--no-updater'),
        };
        remote.app.relaunch(options);
      } else {
        remote.app.relaunch();
      }
      remote.app.exit();
    } else {
      // Relaunching the process with the standard way doesn't work in dev mode.
      // So instead we're sending a signal to dev server to kill the current instance of electron and launch new.
      fetch(`${flipperServerConfig.env.DEV_SERVER_URL}/_restartElectron`, {
        method: 'POST',
      });
    }
  }

  window.FlipperRenderHostInstance = {
    processId: remote.process.pid,
    isProduction,
    readTextFromClipboard() {
      return clipboard.readText();
    },
    writeTextToClipboard(text: string) {
      clipboard.writeText(text);
    },
    async showSaveDialog(options) {
      return (await remote.dialog.showSaveDialog(options))?.filePath;
    },
    async showOpenDialog({filter, defaultPath}) {
      const result = await remote.dialog.showOpenDialog({
        defaultPath,
        properties: ['openFile'],
        filters: filter ? [filter] : undefined,
      });
      return result.filePaths?.[0];
    },
    showSelectDirectoryDialog(defaultPath = path.resolve('/')) {
      return remote.dialog
        .showOpenDialog({
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
      let {filePaths} = await remote.dialog.showOpenDialog({
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
      const {filePath} = await remote.dialog.showSaveDialog({
        defaultPath,
      });

      if (!filePath) {
        return;
      }

      await fs.promises.writeFile(filePath, data, {encoding});
      return filePath;
    },
    openLink(url: string) {
      shell.openExternal(url);
    },
    registerShortcut(shortcut, callback) {
      remote.globalShortcut.register(shortcut, callback);
      return () => remote.globalShortcut.unregister(shortcut);
    },
    hasFocus() {
      return remote.getCurrentWindow().isFocused();
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
      return remote.nativeTheme.shouldUseDarkColors;
    },
    restartFlipper() {
      restart();
    },
    loadDefaultPlugins: getDefaultPluginsIndex,
    serverConfig: flipperServerConfig,
    GK(gatekeeper) {
      return flipperServerConfig.gatekeepers[gatekeeper] ?? false;
    },
    flipperServer,
  };

  setupMenuBar();
}

function getDefaultPluginsIndex() {
  // eslint-disable-next-line import/no-unresolved
  const index = require('../defaultPlugins');
  return index.default || index;
}
