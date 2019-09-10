/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {StoreEnhancerStoreCreator} from 'redux';
import {ResizeObserver} from './ResizeObserver.d';

export {};
type RequestIdleHandle = number;

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__: undefined | StoreEnhancerStoreCreator;

    Flipper: {
      init: () => void;
    };

    // rIC not supportedin TS: https://github.com/Microsoft/TypeScript/issues/21309
    requestIdleCallback: (
      callback: (deadline: {
        didTimeout: boolean;
        timeRemaining: () => number;
      }) => void,
      opts?: {
        timeout: number;
      },
    ) => RequestIdleHandle;
    cancelIdleCallback: (handle: RequestIdleHandle) => void;
    ResizeObserver: ResizeObserver;
  }
}
