/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, FlipperServerConfig, isProduction} from 'flipper-common';
import type {RenderHost} from 'flipper-frontend-core';

export function initializeRenderHost(
  flipperServer: FlipperServer,
  flipperServerConfig: FlipperServerConfig,
) {
  globalThis.FlipperRenderHostInstance = {
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
      throw new Error('Not implemented');
    },
    hasFocus() {
      return true;
    },
    onIpcEvent(_event) {
      // no-op
    },
    sendIpcEvent(_event, ..._args: any[]) {
      // no-op
    },
    shouldUseDarkColors() {
      return false;
    },
    restartFlipper() {
      // TODO:
    },
    serverConfig: flipperServerConfig,
    GK(gatekeeper) {
      return flipperServerConfig.gatekeepers[gatekeeper] ?? false;
    },
    flipperServer,
    async requirePlugin(path) {
      let source = await flipperServer.exec('plugin-source', path);
      // append source url (to make sure a file entry shows up in the debugger)
      source += `\n//# sourceURL=file://${path}`;
      // and source map url (to get source code if available)
      source += `\n//# sourceMappingURL=file://${path.replace(/.js$/, '.map')}`;

      // Plugins are compiled as typical CJS modules, referring to the global
      // 'module', which we'll make available by loading the source into a closure that captures 'module'.
      // Note that we use 'eval', and not 'new Function', because the latter will cause the source maps
      // to be off by two lines (as the function declaration uses two lines in the generated source)
      // eslint-disable-next-line no-eval
      const cjsLoader = eval('(module) => {' + source + '\n}');
      const theModule = {exports: {}};
      cjsLoader(theModule);
      return theModule.exports;
    },
    getStaticResourceUrl(path): string {
      // the 'static' folder is mounted as static middleware in Express at the root
      return '/' + path;
    },
    getLocalIconUrl(icon, url) {
      if (isProduction()) {
        return `icons/${icon.name}-${icon.variant}-${icon.size}@${icon.density}x.png`;
      }
      return url;
    },
  } as RenderHost;
}
