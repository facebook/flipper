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
import type {FlipperLib} from 'flipper-plugin';
import path from 'path';

type ENVIRONMENT_VARIABLES = 'NODE_ENV' | 'DEV_SERVER_URL' | 'CONFIG';
type ENVIRONMENT_PATHS =
  | 'appPath'
  | 'homePath'
  | 'execPath'
  | 'staticPath'
  | 'tempPath'
  | 'desktopPath';

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
  readTextFromClipboard(): string | undefined;
  writeTextToClipboard(text: string): void;
  showSaveDialog?: FlipperLib['showSaveDialog'];
  showOpenDialog?: FlipperLib['showOpenDialog'];
  showSelectDirectoryDialog?(defaultPath?: string): Promise<string | undefined>;
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
  env: Partial<Record<ENVIRONMENT_VARIABLES, string>>;
  paths: Record<ENVIRONMENT_PATHS, string>;
  openLink(url: string): void;
}

let renderHostInstance: RenderHost | undefined;

export function getRenderHostInstance(): RenderHost {
  if (!renderHostInstance) {
    throw new Error('setRenderHostInstance was never called');
  }
  return renderHostInstance;
}

export function setRenderHostInstance(instance: RenderHost) {
  renderHostInstance = instance;
}

if (process.env.NODE_ENV === 'test') {
  setRenderHostInstance({
    processId: -1,
    readTextFromClipboard() {
      return '';
    },
    writeTextToClipboard() {},
    registerShortcut() {
      return () => undefined;
    },
    hasFocus() {
      return true;
    },
    onIpcEvent() {},
    sendIpcEvent() {},
    shouldUseDarkColors() {
      return false;
    },
    restartFlipper() {},
    openLink() {},
    env: process.env,
    paths: {
      appPath: process.cwd(),
      homePath: `/dev/null`,
      desktopPath: `/dev/null`,
      execPath: process.cwd(),
      staticPath: path.join(process.cwd(), 'static'),
      tempPath: `/tmp/`,
    },
  });
}
