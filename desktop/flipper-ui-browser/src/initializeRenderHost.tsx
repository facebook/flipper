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
  uuid,
  wrapRequire,
} from 'flipper-common';
import type {RenderHost} from 'flipper-ui-core';
import FileSaver from 'file-saver';

import {Base64} from 'js-base64';

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

type FileEncoding = 'utf-8' | 'base64' | 'binary';
interface FileDescriptor {
  data: string | Uint8Array | undefined;
  name: string;
  encoding: FileEncoding;
}

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
    async importFile(options?: {
      defaultPath?: string;
      extensions?: string[];
      title?: string;
      encoding?: FileEncoding;
      multi?: false;
    }) {
      return new Promise<FileDescriptor | FileDescriptor[] | undefined>(
        (resolve, reject) => {
          try {
            let selectionMade = false;

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = uuid();
            if (options?.extensions) {
              fileInput.accept = options?.extensions.join(', ');
            }
            fileInput.multiple = options?.multi ?? false;

            fileInput.addEventListener('change', async (event) => {
              selectionMade = true;
              const target = event.target as HTMLInputElement | undefined;
              if (!target || !target.files) {
                resolve(undefined);
                return;
              }

              const files: File[] = Array.from(target.files);
              const descriptors: FileDescriptor[] = await Promise.all(
                files.map(async (file) => {
                  switch (options?.encoding) {
                    case 'base64': {
                      const bytes = new Uint8Array(await file.arrayBuffer());
                      const base64Content = Base64.fromUint8Array(bytes);
                      return {
                        data: base64Content,
                        name: file.name,
                        encoding: 'base64',
                      };
                    }
                    case 'binary':
                      return {
                        data: new Uint8Array(await file.arrayBuffer()),
                        name: file.name,
                        encoding: 'binary',
                      };
                    default:
                      return {
                        data: await file.text(),
                        name: file.name,
                        encoding: 'utf-8',
                      };
                  }
                }),
              );
              resolve(options?.multi ? descriptors : descriptors[0]);
            });

            window.addEventListener(
              'focus',
              () => {
                setTimeout(() => {
                  if (!selectionMade) {
                    resolve(undefined);
                  }
                }, 300);
              },
              {once: true},
            );

            fileInput.click();
          } catch (error) {
            reject(error);
          }
        },
      );
    },
    async exportFile(data: string, {defaultPath}: {defaultPath?: string}) {
      const file = new File([data], defaultPath ?? 'unknown', {
        type: 'text/plain;charset=utf-8',
      });
      FileSaver.saveAs(file);
      return defaultPath;
    },
    async exportFileBinary(
      data: Uint8Array,
      {defaultPath}: {defaultPath?: string},
    ) {
      const file = new File([data], defaultPath ?? 'unknown', {
        type: 'application/octet-stream',
      });
      FileSaver.saveAs(file);
      return defaultPath;
    },
    openLink(url: string) {
      window.open(url, '_blank');
    },
    hasFocus() {
      return document.hasFocus();
    },
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
      flipperServer.exec('shutdown');
    },
    serverConfig: flipperServerConfig,
    GK(gatekeeper) {
      return flipperServerConfig.gatekeepers[gatekeeper] ?? false;
    },
    flipperServer,
    async requirePlugin(path): Promise<{plugin: any; css?: string}> {
      /** path to bundle.js from project root */
      const staticPath = path.includes('/static/')
        ? path.split('/static/', 2).pop()
        : path.split('/desktop/', 2).pop();
      // This is a string as server side is transpiled by typescript.
      // Typescript transpiles dynamic import calls to `require` in the browser bundle
      // We want to explicilty use dynamic import here
      const importStr = `import('/${staticPath}?ts=${Date.now()}')`;
      const source = await flipperServer.exec('plugin-source', path);
      // eslint-disable-next-line no-eval
      const importRes = await eval(importStr);

      return {plugin: importRes, css: source.css};
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
