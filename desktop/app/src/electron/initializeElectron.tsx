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
import {ipcRenderer, remote, SaveDialogReturnValue} from 'electron';
import {setRenderHostInstance} from '../RenderHost';
import {clipboard} from 'electron';
import restart from './restartFlipper';

export function initializeElectron() {
  setRenderHostInstance({
    processId: remote.process.pid,
    readTextFromClipboard() {
      return clipboard.readText();
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
    registerShortcut(shortcut, callback) {
      remote.globalShortcut.register(shortcut, callback);
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
  });
}
