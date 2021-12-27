/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function getInternalDevToolsModule<TModule>(): TModule {
  throw new Error(
    "Can't require internal version of React DevTools from public version of Flipper.",
  );
}
