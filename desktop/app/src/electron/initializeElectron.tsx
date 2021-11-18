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
// eslint-disable-next-line flipper/no-electron-remote-imports
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
import os from 'os';

declare global {
  interface Window {
    FlipperRenderHostInstance: RenderHost;
  }
}

if (process.env.NODE_ENV === 'development' && os.platform() === 'darwin') {
  // By default Node.JS has its internal certificate storage and doesn't use
  // the system store. Because of this, it's impossible to access ondemand / devserver
  // which are signed using some internal self-issued FB certificates. These certificates
  // are automatically installed to MacOS system store on FB machines, so here we're using
  // this "mac-ca" library to load them into Node.JS.
  global.electronRequire('mac-ca');
}

export function initializeElectron() {
  const app = remote.app;
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
      fetch(
        `${window.FlipperRenderHostInstance.env.DEV_SERVER_URL}/_restartElectron`,
        {
          method: 'POST',
        },
      );
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
    async importFile({defaultPath, extensions} = {}) {
      const {filePaths} = await remote.dialog.showOpenDialog({
        defaultPath,
        properties: ['openFile'],
        filters: extensions ? [{extensions, name: ''}] : undefined,
      });

      if (!filePaths.length) {
        return;
      }

      const filePath = filePaths[0];
      const fileName = path.basename(filePath);

      const data = await fs.promises.readFile(filePath, {encoding: 'utf-8'});
      return {
        data,
        name: fileName,
      };
    },
    async exportFile(data, {defaultPath} = {}) {
      const {filePath} = await remote.dialog.showSaveDialog({
        defaultPath,
      });

      if (!filePath) {
        return;
      }

      await fs.promises.writeFile(filePath, data);
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
    env: process.env,
    paths: {
      appPath: app.getAppPath(),
      homePath: app.getPath('home'),
      execPath,
      staticPath: getStaticDir(),
      tempPath: app.getPath('temp'),
      desktopPath: app.getPath('desktop'),
    },
    loadDefaultPlugins: getDefaultPluginsIndex,
  };

  setupMenuBar();
}

function getDefaultPluginsIndex() {
  // eslint-disable-next-line import/no-unresolved
  const index = require('../defaultPlugins');
  return index.default || index;
}

function getStaticDir() {
  let _staticPath = path.resolve(__dirname, '..', '..', '..', 'static');
  if (fs.existsSync(_staticPath)) {
    return _staticPath;
  }
  if (remote && fs.existsSync(remote.app.getAppPath())) {
    _staticPath = path.join(remote.app.getAppPath());
  }
  if (!fs.existsSync(_staticPath)) {
    throw new Error('Static path does not exist: ' + _staticPath);
  }
  return _staticPath;
}
