/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {NotificationEvents} from './dispatcher/notifications';
import type {PluginNotification} from './reducers/notifications';
import type {NotificationConstructorOptions} from 'electron';
import {FlipperLib} from 'flipper-plugin';
import {FlipperServer, FlipperServerConfig} from 'flipper-common';

// Events that are emitted from the main.ts ovr the IPC process bridge in Electron
type MainProcessEvents = {
  'flipper-protocol-handler': [query: string];
  'open-flipper-file': [url: string];
  notificationEvent: [
    eventName: NotificationEvents,
    pluginNotification: PluginNotification,
    arg: null | string | number,
  ];
  trackUsage: any[];
  getLaunchTime: [launchStartTime: number];
};

// Events that are emitted by the child process, to the main process
type ChildProcessEvents = {
  setTheme: [theme: 'dark' | 'light' | 'system'];
  sendNotification: [
    {
      payload: NotificationConstructorOptions;
      pluginNotification: PluginNotification;
      closeAfter?: number;
    },
  ];
  getLaunchTime: [];
  componentDidMount: [];
};

/**
 * Utilities provided by the render host, e.g. Electron, the Browser, etc
 */
export interface RenderHost {
  readonly processId: number;
  readonly isProduction: boolean;
  readTextFromClipboard(): string | undefined;
  writeTextToClipboard(text: string): void;
  /**
   * @deprecated
   * WARNING!
   * It is a low-level API call that might be removed in the future.
   * It is not really deprecated yet, but we'll try to make it so.
   * TODO: Remove in favor of "exportFile"
   */
  showSaveDialog?(options: {
    defaultPath?: string;
    message?: string;
    title?: string;
  }): Promise<string | undefined>;
  /**
   * @deprecated
   * WARNING!
   * It is a low-level API call that might be removed in the future.
   * It is not really deprecated yet, but we'll try to make it so.
   * TODO: Remove in favor of "importFile"
   */
  showOpenDialog?(options: {
    defaultPath?: string;
    filter?: {
      extensions: string[];
      name: string;
    };
  }): Promise<string | undefined>;
  showSelectDirectoryDialog?(defaultPath?: string): Promise<string | undefined>;
  importFile: FlipperLib['importFile'];
  exportFile: FlipperLib['exportFile'];
  /**
   * @returns
   * A callback to unregister the shortcut
   */
  registerShortcut(shortCut: string, callback: () => void): () => void;
  hasFocus(): boolean;
  onIpcEvent<Event extends keyof MainProcessEvents>(
    event: Event,
    callback: (...arg: MainProcessEvents[Event]) => void,
  ): void;
  sendIpcEvent<Event extends keyof ChildProcessEvents>(
    event: Event,
    ...args: ChildProcessEvents[Event]
  ): void;
  shouldUseDarkColors(): boolean;
  restartFlipper(update?: boolean): void;
  openLink(url: string): void;
  loadDefaultPlugins(): Record<string, any>;
  GK(gatekeeper: string): boolean;
  flipperServer: FlipperServer;
  serverConfig: FlipperServerConfig;
  requirePlugin(path: string): Promise<any>;
}

export function getRenderHostInstance(): RenderHost {
  if (!window.FlipperRenderHostInstance) {
    throw new Error('global FlipperRenderHostInstance was never set');
  }
  return window.FlipperRenderHostInstance;
}
