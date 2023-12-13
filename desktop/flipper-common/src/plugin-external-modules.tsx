/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// This list should match `flipper-ui/src/displatcher/plugins.tsx` and `builtInModules` in `desktop/.eslintrc.js`
export const pluginExternalModules = {
  flipper: 'Flipper',
  'flipper-plugin': 'FlipperPlugin',
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOMClient',
  'react-is': 'ReactIs',
  antd: 'antd',
  immer: 'Immer',
  '@emotion/styled': 'emotion_styled',
  '@emotion/css': 'emotion_css',
  '@ant-design/icons': 'antdesign_icons',
  // Used by "bloks-logger" (see its bundle's content)
  'react/jsx-runtime': 'ReactJsxRuntime',
};

export const wrapRequire = <T extends (path: string) => any>(require: T): T =>
  new Proxy(require, {
    apply(target, thisArg, argumentsList) {
      const moduleName = argumentsList[0];
      const replacementName = (
        pluginExternalModules as Record<string, string | undefined>
      )[moduleName];

      if (replacementName && replacementName in globalThis) {
        return (globalThis as any)[replacementName];
      }

      return Reflect.apply(target, thisArg, argumentsList);
    },
  });
