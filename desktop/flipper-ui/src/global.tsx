/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {StoreEnhancerStoreCreator} from 'redux';

declare global {
  // eslint-disable-next-line no-var
  var FlipperRenderHostInstance: any /* RenderHost */;

  interface StoreEnhancerStateSanitizer {
    stateSanitizer: Function;
  }

  interface Window {
    flipperConfig: {
      theme: 'light' | 'dark' | 'system';
      entryPoint: string;
      debug: boolean;
      graphSecret: string;
      appVersion: string;
      sessionId: string;
      unixname: string;
      authToken: string;
    };

    flipperShowMessage?(message: {title?: string; detail?: string}): void;
    flipperHideMessage?(): void;

    __REDUX_DEVTOOLS_EXTENSION__:
      | undefined
      | (StoreEnhancerStoreCreator & StoreEnhancerStateSanitizer);
  }
}
