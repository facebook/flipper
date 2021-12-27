/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function assertNotNull<T extends any>(
  value: T,
  message: string = 'Unexpected null/undefined value found',
): asserts value is Exclude<T, undefined | null> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}
