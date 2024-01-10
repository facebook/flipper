/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CancelledPromiseError, isError} from './errors';
import {getLogger} from './Logger';

type Result =
  | {kind: 'success'}
  | {kind: 'cancelled'}
  | {kind: 'failure'; supportedOperation: boolean; error: any};

export class UnsupportedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

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
  return new Promise<T>((resolve, reject) => {
    promise
      .then((fulfilledValue) => {
        logPlatformSuccessRate(name, {kind: 'success'});
        resolve(fulfilledValue);
      })
      .catch((rejectionReason) => {
        if (rejectionReason instanceof CancelledPromiseError) {
          logPlatformSuccessRate(name, {
            kind: 'cancelled',
          });
        } else {
          logPlatformSuccessRate(name, {
            kind: 'failure',
            supportedOperation: !(rejectionReason instanceof UnsupportedError),
            error: rejectionReason,
          });
        }
        reject(rejectionReason);
      });
  });
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
  const start = performance.now();
  return promise.then(
    (fulfilledValue) => {
      logPluginSuccessRate(
        name,
        plugin,
        {kind: 'success'},
        performance.now() - start,
      );
      return fulfilledValue;
    },
    (rejectionReason) => {
      if (rejectionReason instanceof CancelledPromiseError) {
        logPluginSuccessRate(
          name,
          plugin,
          {
            kind: 'cancelled',
          },
          performance.now() - start,
        );
      } else {
        logPluginSuccessRate(
          name,
          plugin,
          {
            kind: 'failure',
            supportedOperation: !(rejectionReason instanceof UnsupportedError),
            error: rejectionReason,
          },
          performance.now() - start,
        );
      }
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
    logPlatformSuccessRate(name, {kind: 'success'});
    return result;
  } catch (e) {
    logPlatformSuccessRate(name, {
      kind: 'failure',
      supportedOperation: !(e instanceof UnsupportedError),
      error: e,
    });
    throw e;
  }
}

/*
 * Wraps a closure, preserving it's functionality but logging the success or
 failure state of it.
 */
export function tryCatchReportPluginFailures<T>(
  closure: () => T,
  name: string,
  plugin: string,
): T {
  try {
    const result = closure();
    logPluginSuccessRate(name, plugin, {kind: 'success'});
    return result;
  } catch (e) {
    logPluginSuccessRate(name, plugin, {
      kind: 'failure',
      supportedOperation: !(e instanceof UnsupportedError),
      error: e,
    });
    throw e;
  }
}

/*
 * Wraps a closure, preserving it's functionality but logging the success or
 failure state of it.
 */
export async function tryCatchReportPluginFailuresAsync<T>(
  closure: () => Promise<T>,
  name: string,
  plugin: string,
): Promise<T> {
  try {
    const result = await closure();
    logPluginSuccessRate(name, plugin, {kind: 'success'});
    return result;
  } catch (e) {
    logPluginSuccessRate(name, plugin, {
      kind: 'failure',
      supportedOperation: !(e instanceof UnsupportedError),
      error: e,
    });
    throw e;
  }
}

/**
 * Track usage of a feature.
 * @param action Unique name for the action performed. E.g. captureScreenshot
 * @param data Optional additional metadata attached to the event.
 */
export function reportUsage(
  action: string,
  data?: {[key: string]: string},
  plugin?: string,
) {
  getLogger().track('usage', action, data, plugin);
}

export function logPlatformSuccessRate(name: string, result: Result) {
  if (result.kind === 'success') {
    getLogger().track('success-rate', name, {value: 1});
  } else if (result.kind === 'cancelled') {
    getLogger().track('operation-cancelled', name);
  } else {
    getLogger().track('success-rate', name, {
      value: 0,
      supportedOperation: result.supportedOperation ? 1 : 0,
      error: extractMessage(result.error),
    });
  }
}

function logPluginSuccessRate(
  name: string,
  plugin: string,
  result: Result,
  durationMs?: number | undefined,
) {
  if (result.kind === 'success') {
    getLogger().track('success-rate', name, {value: 1, durationMs}, plugin);
  } else if (result.kind === 'cancelled') {
    getLogger().track('operation-cancelled', name, {durationMs}, plugin);
  } else {
    getLogger().track(
      'success-rate',
      name,
      {
        value: 0,
        durationMs,
        supportedOperation: result.supportedOperation ? 1 : 0,
        error: extractMessage(result.error),
      },
      plugin,
    );
  }
}

function extractMessage(error: any) {
  if (isError(error)) {
    return error.message;
  }
  return JSON.stringify(error);
}
