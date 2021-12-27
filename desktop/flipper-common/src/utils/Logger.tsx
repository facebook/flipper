/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {isTest} from '../utils/isTest';

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
