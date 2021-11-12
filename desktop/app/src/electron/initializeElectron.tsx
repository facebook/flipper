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
import {getRenderHostInstance, setRenderHostInstance} from '../RenderHost';
import isProduction from '../utils/isProduction';
import fs from 'fs';
import {setupMenuBar} from './setupMenuBar';

export function initializeElectron() {
  const app = remote.app;
  setRenderHostInstance({
    processId: remote.process.pid,
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
      execPath: process.execPath || remote.process.execPath,
      staticPath: getStaticDir(),
      tempPath: app.getPath('temp'),
      desktopPath: app.getPath('desktop'),
    },
  });

  setupMenuBar();
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

function restart(update: boolean = false) {
  if (isProduction()) {
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
    fetch(`${getRenderHostInstance().env.DEV_SERVER_URL}/_restartElectron`, {
      method: 'POST',
    });
  }
}
