/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getFlipperLib} from 'flipper-plugin';

import {FrameworkEventType, Tag} from '../ClientTypes';
import {TraversalMode, SelectionSource} from '../DesktopTypes';

const UI_DEBUGGER_IDENTIFIER = 'ui-debugger';

type NodeEventPayload = {
  name: string;
  tags: Tag[];
  source?: SelectionSource;
};

type TrackerEvents = {
  'more-options-opened': {};
  'context-menu-opened': {};
  'play-pause-toggled': {
    paused: boolean;
  };
  'framework-event-monitored': {
    eventType: FrameworkEventType;
    monitored: boolean;
  };
  'framework-event-table-row-selected': {
    eventType: FrameworkEventType;
  };
  'framework-event-table-opened': {};
  'framework-event-timeline-filters-adjusted': {};
  'framework-event-timeline-event-selected': {
    eventType: FrameworkEventType;
  };
  'search-term-updated': {
    searchTerm: string;
  };
  'node-selected': NodeEventPayload;
  'node-focused': NodeEventPayload;
  'context-menu-name-copied': {
    name: string;
  };
  'context-menu-copied': {
    name: string;
    key: string;
    value: string;
  };
  'big-grep-searched': {
    searchTerm: string;
    tags: Tag[];
  };
  'ide-opened': {
    ide: string;
    name: string;
    tags: Tag[];
  };
  'target-mode-switched': {
    on: boolean;
  };
  'target-mode-adjusted': {};
  'context-menu-expand-recursive': {};
  'context-menu-collapse-recursive': {};
  'context-menu-collapse-non-ancestors': {};
  'traversal-mode-updated': {mode: TraversalMode};
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
