/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {isTest} from '../utils/isTest';
import {getErrorFromErrorLike, getStringFromErrorLike} from '../utils/errors';

export type LoggerTypes = 'error' | 'warn' | 'info' | 'debug';

export type LoggerTrackType =
  | 'duration'
  | 'usage'
  | 'performance'
  | 'success-rate'
  | 'operation-cancelled';

export type LoggerArgs = {
  isTest?: boolean;
};

export type LoggerInfo = {
  formatted: Array<any>;
  namespace: string;
  type: LoggerTypes;
  msg: any;
  time: number;
};

export type LoggerPerformanceEntry = {
  startTime: number;
  name: string;
  entryType: string;
  duration: number;
};

export interface Logger {
  track(
    type: LoggerTrackType,
    event: string,
    data?: any,
    plugin?: string,
  ): void;

  trackTimeSince(
    mark: string,
    eventName?: string | null | undefined,
    data?: any,
  ): void;

  info(...args: any[]): void;

  warn(...args: any[]): void;

  error(...args: any[]): void;

  debug(...args: any[]): void;
}

let instance: Logger | null = null;

export function getLogger(): Logger {
  if (instance) {
    return instance;
  }

  if (isTest()) {
    instance = new NoopLogger();
    return instance;
  }

  throw new Error(
    'Requested Logger instance without initializing it. Make sure init() is called at app start',
  );
}

// only for testing
export function setLoggerInstance(logger: Logger) {
  instance = logger;
}

/**
 * A logger that doesn't log anything, used in tests and public Flipper builds
 */
export class NoopLogger implements Logger {
  constructor() {}

  track(
    _type: LoggerTrackType,
    _event: string,
    _data?: any,
    _plugin?: string,
  ) {}

  trackTimeSince(_mark: string, _eventName?: string) {}

  info(_data: any, _category: string) {}

  warn(_data: any, _category: string) {}

  error(_data: any, _category: string) {}

  debug(_data: any, _category: string) {}
}

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

export function LoggerFormat(
  type: LoggerTypes,
  ...data: Array<any>
): LoggerInfo {
  function stringify(value: any) {
    if (
      value === undefined ||
      value === null ||
      typeof value == 'object' ||
      typeof value == 'function' ||
      typeof value == 'symbol'
    ) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return JSON.stringify(
          {
            error: `Failed to serialise: ${e}`,
          },
          null,
          2,
        );
      }
    }
    return value;
  }

  const date = new Date().toISOString();
  const human = 'flipper';
  const args = [`[${date}] ${human}`];
  if (data) {
    args[0] += ':';
    data.forEach((e) => args.push(e));
  }
  const msg = data.map((e) => stringify(e)).join(' ');
  return {
    msg,
    namespace: 'flipper',
    time: Date.now(),
    type,
    formatted: args,
  };
}
