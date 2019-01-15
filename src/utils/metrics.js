/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {getInstance} from '../fb-stubs/Logger';

/*
 * Wraps a Promise, preserving it's functionality but logging the success or
 failure state of it, with a given name, based on whether it's fulfilled or
 rejected.
 */
export function recordSuccessMetric(
  promise: Promise<*>,
  name: string,
): Promise<*> {
  return promise.then(
    fulfilledValue => {
      getInstance().track('success-rate', name, 1);
      return fulfilledValue;
    },
    rejectionReason => {
      getInstance().track('success-rate', name, 0);
      return Promise.reject(rejectionReason);
    },
  );
}
