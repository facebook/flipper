/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export let batch: (callback: (...args: any[]) => void) => void = (callback) =>
  callback();

export const setBatchedUpdateImplementation = (
  impl: (callback: (...args: any[]) => void) => void,
) => {
  batch = impl;
};

export function batched<T extends Function>(fn: T): T;
export function batched(fn: any) {
  return function (this: any) {
    let res: any;
    batch(() => {
      // eslint-disable-next-line
      res = fn.apply(this, arguments);
    });
    return res;
  };
}
