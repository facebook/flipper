/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import './global';
import {FlipperLib, Notification} from 'flipper-plugin';
import {FlipperServer, FlipperServerConfig} from 'flipper-common';

type NotificationEvents = 'show' | 'click' | 'close' | 'reply' | 'action';
type PluginNotification = {
  notification: Notification;
  pluginId: string;
  client: null | string; // id
};
type Icon = {
  name: string;
  variant: 'outline' | 'filled';
  size: number;
};

interface NotificationAction {
  // Docs: https://electronjs.org/docs/api/structures/notification-action

  /**
   * The label for the given action.
   */
  text?: string;
  /**
   * The type of action, can be `button`.
   */
  type: 'button';
}

// Subset of electron.d.ts
interface NotificationConstructorOptions {
  /**
   * A title for the notification, which will be shown at the top of the notification
   * window when it is shown.
   */
  title: string;
  /**
   * The body text of the notification, which will be displayed below the title or
   * subtitle.
   */
  body: string;
  /**
   * Actions to add to the notification. Please read the available actions and
   * limitations in the `NotificationAction` documentation.
   *
   * @platform darwin
   */
  actions?: NotificationAction[];
  /**
   * A custom title for the close button of an alert. An empty string will cause the
   * default localized text to be used.
   *
   * @platform darwin
   */
  closeButtonText?: string;
}

// Events that are emitted from the main.ts ovr the IPC process bridge in Electron
type MainProcessEvents = {
  'flipper-protocol-handler': [query: string];
  'open-flipper-file': [name: string, data: string];
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
  storeRehydrated: [];
};

/**
 * Utilities provided by the render host, e.g. Electron, the Browser, etc
 */
export interface RenderHost {
  readTextFromClipboard(): Promise<string> | undefined;
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
  exportFileBinary: FlipperLib['exportFileBinary'];
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
  GK(gatekeeper: string): boolean;
  flipperServer: FlipperServer;
  serverConfig: FlipperServerConfig;
  requirePlugin(path: string): Promise<{plugin: any; css?: string}>;
  getStaticResourceUrl(relativePath: string): string;
  // given the requested icon and proposed public url of the icon, rewrite it to a local icon if needed
  getLocalIconUrl?(icon: Icon, publicUrl: string): string;
  unloadModule?(path: string): void;
  getPercentCPUUsage?(): number;
}

export function getRenderHostInstance(): RenderHost {
  if (!FlipperRenderHostInstance) {
    throw new Error('global FlipperRenderHostInstance was never set');
  }
  return FlipperRenderHostInstance;
}
