/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type LogTypes = 'error' | 'warn' | 'info' | 'debug';
export type TrackType = 'duration' | 'usage' | 'performance' | 'success-rate';
import ScribeLogger from './ScribeLogger';

var instance: ?LogManager = null;

export default class LogManager {
  constructor(store: Store) {
    this.scribeLogger = new ScribeLogger(this);
  }

  scribeLogger: ScribeLogger;

  track(type: TrackType, event: string, data: ?any, plugin?: string) {}

  trackTimeSince(mark: string, eventName: ?string) {}

  info(data: any, category: string) {}

  warn(data: any, category: string) {}

  error(data: any, category: string) {}

  debug(data: any, category: string) {}
}

export function init(store: Store): LogManager {
  if (instance) {
    throw new Error('Attempted to initialize Logger when already initialized');
  }
  instance = new LogManager(store);
  return instance;
}

export function getInstance(): LogManager {
  if (!instance) {
    throw new Error(
      'Requested Logger instance without initializing it. Make sure init() is called at app start',
    );
  }
  return instance;
}
