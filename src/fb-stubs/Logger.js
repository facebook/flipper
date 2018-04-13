/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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

  info(data: any, category: string) {
    // eslint-disable-next-line
    console.info(data, category);
  }

  warn(data: any, category: string) {
    console.warn(data, category);
  }

  error(data: any, category: string) {
    console.error(data, category);
  }

  debug(data: any, category: string) {
    // eslint-disable-next-line
    console.debug(data, category);
  }
}
