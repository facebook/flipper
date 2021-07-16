/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {sleep} from 'flipper-plugin';
import {StatusMessageType} from '../reducers/application';

export default function promiseTimeout<T>(
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

export function showStatusUpdatesForPromise<T>(
  promise: Promise<T>,
  message: string,
  sender: string,
  addStatusMessage: (payload: StatusMessageType) => void,
  removeStatusMessage: (payload: StatusMessageType) => void,
): Promise<T> {
  const statusMsg = {msg: message, sender};
  addStatusMessage(statusMsg);
  return promise
    .then((result) => {
      removeStatusMessage(statusMsg);
      return result;
    })
    .catch((e) => {
      removeStatusMessage(statusMsg);
      throw e;
    });
}

export function showStatusUpdatesForDuration(
  message: string,
  sender: string,
  duration: number,
  addStatusMessage: (payload: StatusMessageType) => void,
  removeStatusMessage: (payload: StatusMessageType) => void,
): void {
  showStatusUpdatesForPromise(
    new Promise<void>((resolve, _reject) => {
      setTimeout(function () {
        resolve();
      }, duration);
    }),
    message,
    sender,
    addStatusMessage,
    removeStatusMessage,
  );
}
