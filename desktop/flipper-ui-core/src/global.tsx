/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {StoreEnhancerStoreCreator} from 'redux';
import {RenderHost} from './RenderHost';

declare global {
  interface StoreEnhancerStateSanitizer {
    stateSanitizer: Function;
  }

  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__:
      | undefined
      | (StoreEnhancerStoreCreator & StoreEnhancerStateSanitizer);
  }
}
