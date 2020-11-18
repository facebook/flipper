/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {unstable_batchedUpdates} from 'react-dom';

export const batch = unstable_batchedUpdates;

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
