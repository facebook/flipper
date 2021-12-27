/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {timeout} from 'flipper-plugin';
import {StatusMessageType} from '../reducers/application';

/**
 * @deprecated use timeout from flipper-plugin
 * @param ms @
 * @param promise
 * @param timeoutMessage
 * @returns
 */
export default function promiseTimeout<T>(
  ms: number,
  promise: Promise<T>,
  timeoutMessage?: string,
): Promise<T> {
  return timeout(ms, promise, timeoutMessage);
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
