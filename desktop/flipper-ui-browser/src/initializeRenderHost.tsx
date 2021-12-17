/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, FlipperServerConfig} from 'flipper-common';
import {RenderHost} from 'flipper-ui-core';

export function initializeRenderHost(
  flipperServer: FlipperServer,
  flipperServerConfig: FlipperServerConfig,
) {
  window.FlipperRenderHostInstance = {
    readTextFromClipboard() {
      // TODO:
      return undefined;
    },
    writeTextToClipboard(_text: string) {
      // TODO:
    },
    async importFile() {
      throw new Error('Not implemented');
    },
    async exportFile() {
      throw new Error('Not implemented');
    },
    openLink(url: string) {
      window.open(url, '_blank');
    },
    hasFocus() {
      return document.hasFocus();
    },
    onIpcEvent(_event) {
      // no-op
    },
    sendIpcEvent(_event, ..._args: any[]) {
      // no-op
    },
    shouldUseDarkColors() {
      return !!(
        window.flipperConfig.theme === 'dark' ||
        (window.flipperConfig.theme === 'system' &&
          window.matchMedia?.('(prefers-color-scheme: dark)'))
      );
    },
    restartFlipper() {
      window.flipperShowError!(
        'Flipper settings have changed, please restart flipper server for the changes to take effect',
      );
    },
    loadDefaultPlugins: getDefaultPluginsIndex,
    serverConfig: flipperServerConfig,
    GK(gatekeeper) {
      return flipperServerConfig.gatekeepers[gatekeeper] ?? false;
    },
    flipperServer,
    async requirePlugin(path) {
      // TODO: use `await import(path)`?
      const source = await flipperServer.exec('plugin-source', path);
      // eslint-disable-next-line no-eval
      return eval(source);
    },
    getStaticResourceUrl(path): string {
      // the 'static' folder is mounted as static middleware in Express at the root
      return '/' + path;
    },
  } as RenderHost;
}

function getDefaultPluginsIndex() {
  // @ts-ignore
  // eslint-disable-next-line import/no-unresolved
  const index = require('./defaultPlugins');
  return index.default || index;
}
