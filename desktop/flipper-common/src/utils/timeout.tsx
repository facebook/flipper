/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function timeout<T>(
  ms: number,
  promise: Promise<T>,
  timeoutMessage?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage || `Timed out in ${ms} ms.`));
    }, ms);

    promise
      .then(resolve)
      .finally(() => {
        clearTimeout(timeoutHandle);
      })
      .catch(reject);
  });
}
