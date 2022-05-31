/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// eslint-disable-next-line no-restricted-imports
import electron, {ipcMain, BrowserWindow} from 'electron';
// eslint-disable-next-line flipper/no-relative-imports-across-packages
import type {
  ElectronIpcAsyncCommands,
  ElectronIpcEvents,
  ElectronIpcSyncCommands,
} from '../app/src/electronIpc';

export class ElectronIpcClientMain {
  constructor(private readonly window: BrowserWindow) {
    this.handleAll();
  }

  private handleAll() {
    for (const command of Object.keys(this.commandsAsync)) {
      ipcMain.handle(command, (_event, params) =>
        this.commandsAsync[command as keyof ElectronIpcAsyncCommands](params),
      );
    }
    // eslint-disable-next-line node/no-sync
    for (const command of Object.keys(this.commandsSync)) {
      ipcMain.on(command, (event) => {
        event.returnValue =
          // eslint-disable-next-line node/no-sync
          this.commandsSync[command as keyof ElectronIpcSyncCommands]();
      });
    }
  }

  send<T extends keyof ElectronIpcEvents>(
    eventName: T,
    data: ElectronIpcEvents[T],
  ) {
    this.window.webContents.send(eventName, data);
  }

  private readonly commandsAsync: ElectronIpcAsyncCommands = {
    exit: async () => electron.app.exit(),
    quit: async () => electron.app.quit(),
    getPath: async (pathName) => {
      switch (pathName) {
        case 'app': {
          return electron.app.getAppPath();
        }
        default: {
          return electron.app.getPath(pathName);
        }
      }
    },
    getProcess: async () => {
      const {pid, execPath} = process;
      return {pid, execPath};
    },
    relaunch: async (options) => electron.app.relaunch(options),
    showSaveDialog: (options) => electron.dialog.showSaveDialog(options),
    showOpenDialog: (options) => electron.dialog.showOpenDialog(options),
    getNativeTheme: async () => {
      const {
        themeSource,
        shouldUseDarkColors,
        shouldUseHighContrastColors,
        shouldUseInvertedColorScheme,
        inForcedColorsMode,
      } = electron.nativeTheme;
      return {
        themeSource,
        shouldUseDarkColors,
        shouldUseHighContrastColors,
        shouldUseInvertedColorScheme,
        inForcedColorsMode,
      };
    },
    getApp: async () => {
      const {name} = electron.app;
      return {name};
    },
  };

  private readonly commandsSync: ElectronIpcSyncCommands = {
    getCurrentWindowState: () => {
      const isFocused = this.window.isFocused();
      return {isFocused};
    },
  };
}
