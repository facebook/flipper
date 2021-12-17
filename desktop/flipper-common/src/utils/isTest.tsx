/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare const process: any;
const _isTest = typeof process !== 'undefined' && !!process.env.JEST_WORKER_ID;

export function isTest(): boolean {
  return _isTest;
}
