/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getFlipperLib} from 'flipper-plugin';
import {FrameworkEventType} from './types';

const UI_DEBUGGER_IDENTIFIER = 'ui-debugger';

type TrackerEvents = {
  'more-options-opened': {};
  'play-pause-toggled': {
    paused: boolean;
  };
  'framework-event-monitored': {
    eventType: FrameworkEventType;
    monitored: boolean;
  };
  'search-term-updated': {
    searchTerm: string;
  };
};

export interface Tracker {
  track<Event extends keyof TrackerEvents>(
    event: Event,
    payload: TrackerEvents[Event],
  ): void;
}

class UIDebuggerTracker implements Tracker {
  track<Event extends keyof TrackerEvents>(
    event: Event,
    payload: TrackerEvents[Event],
  ): void {
    getFlipperLib().logger.track(
      'usage',
      event,
      payload,
      UI_DEBUGGER_IDENTIFIER,
    );
  }
}

export const tracker: Tracker = new UIDebuggerTracker();
