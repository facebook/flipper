/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module NodeJS {
  interface Global {
    window: Window | undefined;
    WebSocket: any;
    fetch: any;
    originalConsole: Console | undefined;
  }
}
