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
  antdesign_icons: any;
}

export const setGlobalObject = (replacements: GlobalObject) => {
  const globalObject = (function (this: any) {
    return this;
  })();
  for (const [name, module] of Object.entries(replacements)) {
    globalObject[name] = module;
  }
};
