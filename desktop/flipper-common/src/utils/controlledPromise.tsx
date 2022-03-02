/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

type Res<T> = {
  promise: Promise<T>;
  resolve: (...res: T extends void ? [] : [T]) => void;
  reject: (reason: unknown) => void;
} & (
  | {
      state: 'pending';
      promiseVal: undefined;
    }
  | {state: 'resolved'; promiseVal: T}
  | {state: 'rejected'; promiseVal: unknown}
);

export const createControlledPromise = <T,>(): Res<T> => {
  let resolve!: Res<T>['resolve'];
  let reject!: Res<T>['reject'];
  let state: 'pending' | 'resolved' | 'rejected' = 'pending';
  let promiseVal: T | unknown | undefined;
  const promise = new Promise<T>((resolveP, rejectP) => {
    resolve = ((val) => {
      state = 'resolved';
      promiseVal = val;
      resolveP(val as T | PromiseLike<T>);
    }) as typeof resolve;
    reject = (err) => {
      state = 'rejected';
      promiseVal = err;
      rejectP(err);
    };
  });
  return {
    promise,
    resolve,
    reject,
    state,
    promiseVal,
  } as Res<T>;
};
