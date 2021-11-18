/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger} from '../utils/Logger';
import {Device} from './DevicePlugin';
import {NormalizedMenuEntry} from './MenuEntry';
import {RealFlipperClient} from './Plugin';
import {Notification} from './Notification';
import {DetailSidebarProps} from '../ui/DetailSidebar';

export interface FileDescriptor {
  data: string;
  name: string;
}

/**
 * This interface exposes all global methods for which an implementation will be provided by Flipper itself
 */
export interface FlipperLib {
  isFB: boolean;
  logger: Logger;
  enableMenuEntries(menuEntries: NormalizedMenuEntry[]): void;
  createPaste(input: string): Promise<string | undefined>;
  GK(gatekeeper: string): boolean;
  selectPlugin(
    device: Device,
    client: RealFlipperClient | null,
    pluginId: string,
    deeplink: unknown,
  ): void;
  writeTextToClipboard(text: string): void;
  openLink(url: string): void;
  showNotification(pluginKey: string, notification: Notification): void;
  DetailsSidebarImplementation?(
    props: DetailSidebarProps,
  ): React.ReactElement | null;
  showOpenDialog?(options: {
    defaultPath?: string;
    filter?: {
      extensions: string[];
      name: string;
    };
  }): Promise<string | undefined>;
  /**
   * @returns
   * Imported file data.
   * If user cancelled a file selection - undefined.
   */
  importFile(options: {
    defaultPath?: string;
    extensions?: string[];
  }): Promise<FileDescriptor | undefined>;
  /**
   * @returns
   * An exported file path (if available) or a file name.
   * If user cancelled a file selection - undefined.
   */
  exportFile(
    data: string,
    options?: {
      defaultPath?: string;
    },
  ): Promise<string | undefined>;
  paths: {
    homePath: string;
    appPath: string;
  };
}

export let flipperLibInstance: FlipperLib | undefined;

export function tryGetFlipperLibImplementation(): FlipperLib | undefined {
  return flipperLibInstance;
}

export function getFlipperLib(): FlipperLib {
  if (!flipperLibInstance) {
    throw new Error('Flipper lib not instantiated');
  }
  return flipperLibInstance;
}

export function setFlipperLibImplementation(impl: FlipperLib | undefined) {
  flipperLibInstance = impl;
}
