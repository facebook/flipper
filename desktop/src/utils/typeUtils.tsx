/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Typescript doesn't know Array.filter(Boolean) won't contain nulls.
// So use Array.filter(notNull) instead.
export function notNull<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
