/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createContext, useContext} from 'react';

export type LogTypes = 'error' | 'warn' | 'info' | 'debug';
export type TrackType =
  | 'duration'
  | 'usage'
  | 'performance'
  | 'success-rate'
  | 'operation-cancelled';

export interface Logger {
  track(type: TrackType, event: string, data?: any, plugin?: string): void;

  trackTimeSince(
    mark: string,
    eventName?: string | null | undefined,
    data?: any,
  ): void;

  info(data: any, category: string): void;

  warn(data: any, category: string): void;

  error(data: any, category: string): void;

  debug(data: any, category: string): void;
}

export const stubLogger: Logger = {
  track() {},
  trackTimeSince() {},
  info() {
    // eslint-disable-next-line
    console.log.apply(console, arguments as any);
  },
  warn() {
    // eslint-disable-next-line
    console.warn.apply(console, arguments as any);
  },
  error() {
    // eslint-disable-next-line
    console.error.apply(console, arguments as any);
  },
  debug() {
    // eslint-disable-next-line
    console.debug.apply(console, arguments as any);
  },
};

export const _LoggerContext = createContext<Logger>(stubLogger);

/**
 * Provides the default logger that can be used for console logging,
 * error reporting and performance measurements.
 * In internal Facebook builds this is wired up to the internal statistic reporting.
 * Prefer using `logger` over using `console` directly.
 */
export function useLogger(): Logger {
  return useContext(_LoggerContext);
}
