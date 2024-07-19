/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function safeStringify(value: any, space: number = 2) {
  try {
    return JSON.stringify(value, null, space);
  } catch (e) {
    return `<Failed to serialize: ${e}>`;
  }
}
