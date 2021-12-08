/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {RenderHost} from 'flipper-ui-core';

declare global {
  interface Window {
    flipperConfig: {
      theme: 'light' | 'dark' | 'system';
      entryPoint: string;
      debug: boolean;
    };

    FlipperRenderHostInstance: RenderHost;

    flipperShowError?(error: string): void;
    flipperHideError?(): void;
  }
}
