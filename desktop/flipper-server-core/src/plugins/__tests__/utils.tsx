/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ServerAddOnStartDetails} from 'flipper-common';

export const pluginName = 'lightSaber';
export const initialOwner = 'yoda';
export const detailsBundled: ServerAddOnStartDetails = {
  isBundled: true,
};
export const detailsInstalled: ServerAddOnStartDetails = {
  path: '/dagobar/',
};

export const createControlledPromise = <T,>() => {
  let resolve!: (...res: T extends void ? [] : [T]) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolveP, rejectP) => {
    resolve = resolveP as typeof resolve;
    reject = rejectP;
  });
  return {
    promise,
    resolve,
    reject,
  };
};
