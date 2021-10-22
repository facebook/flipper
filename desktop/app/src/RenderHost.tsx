/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * Utilities provided by the render host, e.g. Electron, the Browser, etc
 */
export interface RenderHost {
  readonly processId: number;
  readTextFromClipboard(): string | undefined;
  selectDirectory?(defaultPath?: string): Promise<string | undefined>;
  registerShortcut(shortCut: string, callback: () => void): void;
  hasFocus(): boolean;
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
  });
}
