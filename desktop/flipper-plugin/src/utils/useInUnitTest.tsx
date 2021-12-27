/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {isTest} from 'flipper-common';

/**
 * Check if we are currently running a unit test.
 * Use this hook to disable certain functionality that is probably not going to work as expected in the JSDom implementaiton
 */
export function useInUnitTest(): boolean {
  return isTest();
}
