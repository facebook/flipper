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

 Use this variant to report failures in core platform (Flipper) code.
 */
export function reportPlatformFailures<T>(
  promise: Promise<T>,
  name: string,
): Promise<T> {
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

/*
 * Wraps a Promise, preserving it's functionality but logging the success or
 failure state of it, with a given name, based on whether it's fulfilled or
 rejected.

 Use this variant to report failures in plugin code.
 */
export function reportPluginFailures<T>(
  promise: Promise<T>,
  name: string,
  plugin: string,
): Promise<T> {
  return promise.then(
    fulfilledValue => {
      getInstance().track('success-rate', name, 1, plugin);
      return fulfilledValue;
    },
    rejectionReason => {
      getInstance().track('success-rate', name, 0, plugin);
      return Promise.reject(rejectionReason);
    },
  );
}

/*
 * Wraps a closure, preserving it's functionality but logging the success or
 failure state of it.
 */
export function tryCatchReportPlatformFailures<T>(
  closure: () => T,
  name: string,
): T {
  try {
    const result = closure();
    getInstance().track('success-rate', name, 1);
    return result;
  } catch (e) {
    getInstance().track('success-rate', name, 0);
    throw e;
  }
}
