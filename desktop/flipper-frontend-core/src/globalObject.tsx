/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// this list should match `replace-flipper-requires.tsx` and the `builtInModules` in `desktop/.eslintrc`
export interface GlobalObject {
  React: any;
  ReactDOM: any;
  ReactDOMClient: any;
  ReactIs: any;
  Flipper: any;
  FlipperPlugin: any;
  Immer: any;
  antd: any;
  emotion_styled: any;
  emotion_css: any;
  antdesign_icons: any;
  ReactJsxRuntime: any;
}

declare module globalThis {
  let React: any;
  let ReactDOM: any;
  let ReactDOMClient: any;
  let ReactIs: any;
  let Flipper: any;
  let FlipperPlugin: any;
  let Immer: any;
  let antd: any;
  let emotion_styled: any;
  let emotion_css: any;
  let antdesign_icons: any;
  let ReactJsxRuntime: any;
}

export const setGlobalObject = (replacements: GlobalObject) => {
  for (const [name, module] of Object.entries(replacements)) {
    globalThis[name as keyof GlobalObject] = module;
  }
};
