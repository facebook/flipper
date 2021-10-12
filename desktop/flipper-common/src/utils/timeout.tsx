/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {sleep} from './sleep';

export function timeout<T>(
  ms: number,
  promise: Promise<T>,
  timeoutMessage?: string,
): Promise<T> {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = sleep(ms).then(() => {
    throw new Error(timeoutMessage || `Timed out in ${ms} ms.`);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
}
