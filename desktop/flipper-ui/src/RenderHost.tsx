/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import './global';

/**
 * Utilities provided by the render host, e.g. Electron, the Browser, etc
 */
export interface RenderHost {
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
  GK(gatekeeper: string): boolean;
  unloadModule?(path: string): void;
  getPercentCPUUsage?(): number;
}

export function getRenderHostInstance(): RenderHost {
  if (!FlipperRenderHostInstance) {
    throw new Error('global FlipperRenderHostInstance was never set');
  }
  return FlipperRenderHostInstance;
}
