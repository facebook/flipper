/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type Events = {
  message: any;
  connected: never;
  disconnected: never;
};

export type Methods = {
  message: (data: any) => Promise<void>;
  globalDevTools: () => Promise<string | undefined>;
};
