/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlipperServer,
  FlipperServerConfig,
  isProduction,
  wrapRequire,
} from 'flipper-common';
import type {RenderHost} from 'flipper-ui-core';

declare module globalThis {
  let require: any;
}

// Whenever we bundle plugins, we assume that they are going to share some modules - React, React-DOM, ant design and etc.
// It allows us to decrease the bundle size and not to create separate React roots for every plugin
// To tell a plugin that a module is going to be provided externally, we add the module to the list of externals (see https://esbuild.github.io/api/#external).
// As a result, esbuild does not bundle hte contents of the module. Instead, it wraps the module name with `require(...)`.
// `require` does not exist ion the browser environment, so we substitute it here to feed the plugin our global module.
globalThis.require = wrapRequire((module: string) => {
  throw new Error(
    `Dynamic require is not supported in browser envs. Tried to require: ${module}`,
  );
});

export function initializeRenderHost(
  flipperServer: FlipperServer,
  flipperServerConfig: FlipperServerConfig,
) {
  FlipperRenderHostInstance = {
    async readTextFromClipboard() {
      return await navigator.clipboard.readText();
    },
    writeTextToClipboard(text: string) {
      return navigator.clipboard.writeText(text);
    },
    async importFile() {
      throw new Error('Not implemented');
    },
    async exportFile() {
      throw new Error('Not implemented');
    },
    async exportFileBinary() {
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
      window.flipperShowError?.(
        'Flipper settings have changed, please restart flipper server for the changes to take effect',
      );
    },
    serverConfig: flipperServerConfig,
    GK(gatekeeper) {
      return flipperServerConfig.gatekeepers[gatekeeper] ?? false;
    },
    flipperServer,
    async requirePlugin(path): Promise<{plugin: any; css?: string}> {
      const source = await flipperServer.exec('plugin-source', path);

      let js = source.js;
      // append source url (to make sure a file entry shows up in the debugger)
      js += `\n//# sourceURL=file://${path}`;
      if (isProduction()) {
        // and source map url (to get source code if available)
        js += `\n//# sourceMappingURL=file://${path}.map`;
      }

      // Plugins are compiled as typical CJS modules, referring to the global
      // 'module', which we'll make available by loading the source into a closure that captures 'module'.
      // Note that we use 'eval', and not 'new Function', because the latter will cause the source maps
      // to be off by two lines (as the function declaration uses two lines in the generated source)
      // eslint-disable-next-line no-eval
      const cjsLoader = eval('(module) => {' + js + '\n}');
      const theModule = {exports: {}};
      cjsLoader(theModule);
      return {plugin: theModule.exports, css: source.css};
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
