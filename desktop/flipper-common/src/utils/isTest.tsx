/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const _isTest = !!process.env.JEST_WORKER_ID;

export function isTest(): boolean {
  return _isTest;
}
