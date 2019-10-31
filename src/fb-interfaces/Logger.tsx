/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type LogTypes = 'error' | 'warn' | 'info' | 'debug';
export type TrackType =
  | 'duration'
  | 'usage'
  | 'performance'
  | 'success-rate'
  | 'operation-cancelled';

export type Args = {
  isHeadless?: boolean;
  isTest?: boolean;
};

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
