/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {TrackType, Logger} from '../fb-interfaces/Logger';
import type {Store} from '../reducers/index';
import ScribeLogger from './ScribeLogger';

var instance: ?StubLogger = null;

type Args = {
  isHeadless?: boolean,
};

class StubLogger implements Logger {
  constructor(store: Store, args?: Args) {
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

export function init(store: Store, args?: Args): Logger {
  if (instance) {
    throw new Error('Attempted to initialize Logger when already initialized');
  }
  instance = new StubLogger(store);
  return instance;
}

export function getInstance(): Logger {
  if (!instance) {
    throw new Error(
      'Requested Logger instance without initializing it. Make sure init() is called at app start',
    );
  }
  return instance;
}
