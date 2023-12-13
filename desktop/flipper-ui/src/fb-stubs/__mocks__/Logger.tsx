/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../../reducers/index';
import {getErrorFromErrorLike, getStringFromErrorLike} from 'flipper-common';
import {LoggerArgs, Logger} from 'flipper-common';

const instance = {
  track: jest.fn(),
  trackTimeSince: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

export function LoggerExtractError(...data: Array<any>): {
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

export function init(_store: Store, _args?: LoggerArgs): Logger {
  return instance;
}

export function getInstance(): Logger {
  return instance;
}
