/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {NotificationEvents} from './dispatcher/notifications';
import {PluginNotification} from './reducers/notifications';
import type {NotificationConstructorOptions} from 'electron';

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
  selectDirectory?(defaultPath?: string): Promise<string | undefined>;
  registerShortcut(shortCut: string, callback: () => void): void;
  hasFocus(): boolean;
  onIpcEvent<Event extends keyof MainProcessEvents>(
    event: Event,
    callback: (...arg: MainProcessEvents[Event]) => void,
  ): void;
  sendIpcEvent<Event extends keyof ChildProcessEvents>(
    event: Event,
    ...args: ChildProcessEvents[Event]
  ): void;
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
    registerShortcut() {},
    hasFocus() {
      return true;
    },
    onIpcEvent() {},
    sendIpcEvent() {},
  });
}
