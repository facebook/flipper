/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// eslint-disable-next-line no-restricted-imports
import type {
  NativeTheme,
  SaveDialogReturnValue,
  SaveDialogOptions,
  OpenDialogOptions,
  OpenDialogReturnValue,
} from 'electron';
import {ipcRenderer} from 'electron/renderer';

export interface ElectronIpcAsyncCommands {
  getPath: (path: 'app' | 'home' | 'temp' | 'desktop') => Promise<string>;
  getProcess: () => Promise<{execPath: string; pid: number}>;
  relaunch: (options?: {args: string[]}) => Promise<void>;
  showSaveDialog: (
    options: SaveDialogOptions,
  ) => Promise<SaveDialogReturnValue>;
  showOpenDialog: (
    options: OpenDialogOptions,
  ) => Promise<OpenDialogReturnValue>;
  getNativeTheme: () => Promise<
    Pick<
      NativeTheme,
      | 'inForcedColorsMode'
      | 'shouldUseDarkColors'
      | 'shouldUseHighContrastColors'
      | 'shouldUseInvertedColorScheme'
      | 'themeSource'
    >
  >;
  quit: () => Promise<void>;
  exit: () => Promise<void>;
  getApp: () => Promise<{
    name: string;
  }>;
}

export interface ElectronIpcSyncCommands {
  getCurrentWindowState: () => {
    isFocused: boolean;
  };
}

export interface ElectronIpcEvents {
  menuItemAction: {
    menu: 'view' | 'root';
    label: string;
    action: 'click';
  };
}

export class ElectronIpcClientRenderer {
  on<T extends keyof ElectronIpcEvents>(
    eventName: T,
    cb: (data: ElectronIpcEvents[T]) => void,
  ) {
    ipcRenderer.on(eventName, (_event, data) => cb(data));
  }

  send<T extends keyof ElectronIpcAsyncCommands>(
    eventName: T,
    ...args: Parameters<ElectronIpcAsyncCommands[T]>
  ): ReturnType<ElectronIpcAsyncCommands[T]> extends Promise<any>
    ? ReturnType<ElectronIpcAsyncCommands[T]>
    : never {
    return ipcRenderer.invoke(eventName, ...args) as any;
  }

  sendSync<T extends keyof ElectronIpcSyncCommands>(
    eventName: T,
    ...args: Parameters<ElectronIpcSyncCommands[T]>
  ): ReturnType<ElectronIpcSyncCommands[T]> {
    // eslint-disable-next-line node/no-sync
    return ipcRenderer.sendSync(eventName, ...args);
  }
}
