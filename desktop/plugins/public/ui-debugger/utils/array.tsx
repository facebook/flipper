/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function filterOutFalsy<T>(
  arr: T[],
): Exclude<T, false | 0 | '' | null | undefined>[] {
  return arr.filter(Boolean) as Exclude<T, false | 0 | '' | null | undefined>[];
}
