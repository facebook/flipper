/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// otherwise there is an error with `declare global`
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {RenderHost} from 'flipper-ui-core';

declare global {
  interface Window {
    flipperConfig: {
      theme: 'light' | 'dark' | 'system';
      entryPoint: string;
      debug: boolean;
    };
    GRAPH_SECRET: string;
    FLIPPER_APP_VERSION: string;
    FLIPPER_SESSION_ID: string;
    FLIPPER_UNIXNAME: string;

    flipperShowMessage?(message: string): void;
    flipperHideMessage?(): void;
  }
}
