/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function safeStringify(value: any) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return '<Failed to serialize: ' + e + '>';
  }
}
