/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

declare module NodeJS {
  interface Global {
    __REVISION__: string | undefined;
    electronRequire: (name: string) => void;
    window: Window | undefined;
  }
}
