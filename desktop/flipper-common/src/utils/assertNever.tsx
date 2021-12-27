/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export const assertNever: (val: never) => asserts val = (val) => {
  if (val) {
    throw new Error(`Assert never failed. Received ${val}`);
  }
};
