/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../../reducers/index';
import {
  getErrorFromErrorLike,
  getStringFromErrorLike,
} from '../../utils/errors';
import {Args, Logger} from '../../fb-interfaces/Logger';

const instance = {
  track: jest.fn(),
  trackTimeSince: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

export function extractError(...data: Array<any>): {
  message: string;
  error: Error;
} {
  const message = getStringFromErrorLike(data);
  const error = getErrorFromErrorLike(data) ?? new Error(message);
  return {
    message,
    error,
  };
}

export function init(_store: Store, _args?: Args): Logger {
  return instance;
}

export function getInstance(): Logger {
  return instance;
}
