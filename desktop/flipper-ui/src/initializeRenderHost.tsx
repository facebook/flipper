/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServerConfig, isProduction, wrapRequire} from 'flipper-common';
import {getFlipperServer} from './flipperServer';
import type {RenderHost} from './RenderHost';

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

export function initializeRenderHost(flipperServerConfig: FlipperServerConfig) {
  FlipperRenderHostInstance = {
    onIpcEvent(event, cb) {
      window.addEventListener(event as string, (ev) => {
        cb(...((ev as CustomEvent).detail as any));
      });
    },
    sendIpcEvent(event, ...args: any[]) {
      window.dispatchEvent(new CustomEvent(event, {detail: args}));
    },
    shouldUseDarkColors() {
      return !!(
        window.flipperConfig.theme === 'dark' ||
        (window.flipperConfig.theme === 'system' &&
          window.matchMedia?.('(prefers-color-scheme: dark)'))
      );
    },
    restartFlipper() {
      getFlipperServer().exec('shutdown');
    },
    serverConfig: flipperServerConfig,
    GK(gatekeeper) {
      return flipperServerConfig.gatekeepers[gatekeeper] ?? false;
    },
    async requirePlugin(path): Promise<{plugin: any; css?: string}> {
      const source = await getFlipperServer().exec('plugin-source', path);

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
        return `icons/${icon.name}-${icon.variant}_d.png`;
      }
      return url;
    },
  } as RenderHost;
}
