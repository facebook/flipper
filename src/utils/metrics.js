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
      logPlatformSuccessRate(name, {isSuccess: true});
      return fulfilledValue;
    },
    rejectionReason => {
      logPlatformSuccessRate(name, {isSuccess: false, error: rejectionReason});
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
      logPluginSuccessRate(name, plugin, {isSuccess: true});
      return fulfilledValue;
    },
    rejectionReason => {
      logPluginSuccessRate(name, plugin, {
        isSuccess: false,
        error: rejectionReason,
      });
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
    logPlatformSuccessRate(name, {isSuccess: true});
    return result;
  } catch (e) {
    logPlatformSuccessRate(name, {isSuccess: false, error: e});
    throw e;
  }
}

type Result = {isSuccess: true} | {isSuccess: false, error: any};

function logPlatformSuccessRate(name: string, result: Result) {
  if (result.isSuccess) {
    getInstance().track('success-rate', name, {value: 1});
  } else {
    getInstance().track('success-rate', name, {
      value: 0,
      error: extractMessage(result.error),
    });
  }
}

function logPluginSuccessRate(name: string, plugin: string, result: Result) {
  if (result.isSuccess) {
    getInstance().track('success-rate', name, {value: 1}, plugin);
  } else {
    getInstance().track(
      'success-rate',
      name,
      {value: 1, error: extractMessage(result.error)},
      plugin,
    );
  }
}

function extractMessage(error: any) {
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}
