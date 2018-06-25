/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type LogTypes = 'error' | 'warn' | 'info' | 'debug';
export type TrackType = 'duration' | 'usage' | 'performance';
import ScribeLogger from './ScribeLogger';

export default class LogManager {
  constructor() {
    this.scribeLogger = new ScribeLogger(this);
  }

  scribeLogger: ScribeLogger;

  track(type: TrackType, event: string, data: ?any) {}

  trackTimeSince(mark: string, eventName: ?string) {}

  info(data: any, category: string) {}

  warn(data: any, category: string) {}

  error(data: any, category: string) {}

  debug(data: any, category: string) {}
}
