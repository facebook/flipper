/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {computeUsageSummary, UsageSummary} from '../tracking';
import {State} from '../../reducers/usageTracking';

test('Never focused', () => {
  const state: State = {
    timeline: [{type: 'TIMELINE_START', time: 100, isFocused: false}],
  };
  const result = computeUsageSummary(state, 200);
  expect(result).toReportTimeSpent('total', 0, 100);
});

test('Always focused', () => {
  const state: State = {
    timeline: [{type: 'TIMELINE_START', time: 100, isFocused: true}],
  };
  const result = computeUsageSummary(state, 200);
  expect(result).toReportTimeSpent('total', 100, 0);
});

test('Focused then unfocused', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {type: 'WINDOW_FOCUS_CHANGE', time: 150, isFocused: false},
    ],
  };
  const result = computeUsageSummary(state, 350);
  expect(result).toReportTimeSpent('total', 50, 200);
});

test('Unfocused then focused', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: false},
      {type: 'WINDOW_FOCUS_CHANGE', time: 150, isFocused: true},
    ],
  };
  const result = computeUsageSummary(state, 350);
  expect(result).toReportTimeSpent('total', 200, 50);
});

test('Unfocused then focused then unfocused', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: false},
      {type: 'WINDOW_FOCUS_CHANGE', time: 150, isFocused: true},
      {type: 'WINDOW_FOCUS_CHANGE', time: 350, isFocused: false},
    ],
  };
  const result = computeUsageSummary(state, 650);
  expect(result).toReportTimeSpent('total', 200, 350);
});

test('Focused then unfocused then focused', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {type: 'WINDOW_FOCUS_CHANGE', time: 150, isFocused: false},
      {type: 'WINDOW_FOCUS_CHANGE', time: 350, isFocused: true},
    ],
  };
  const result = computeUsageSummary(state, 650);
  expect(result).toReportTimeSpent('total', 350, 200);
});

test('Always focused plugin change', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {type: 'PLUGIN_SELECTED', time: 150, plugin: 'Layout'},
    ],
  };
  const result = computeUsageSummary(state, 200);
  expect(result).toReportTimeSpent('total', 100, 0);
  expect(result).toReportTimeSpent('Layout', 50, 0);
});

test('Focused then plugin change then unfocusd', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {type: 'PLUGIN_SELECTED', time: 150, plugin: 'Layout'},
      {type: 'WINDOW_FOCUS_CHANGE', time: 350, isFocused: false},
    ],
  };
  const result = computeUsageSummary(state, 650);
  expect(result).toReportTimeSpent('total', 250, 300);
  expect(result).toReportTimeSpent('Layout', 200, 300);
});

test('Multiple plugin changes', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {type: 'PLUGIN_SELECTED', time: 150, plugin: 'Layout'},
      {type: 'PLUGIN_SELECTED', time: 350, plugin: 'Network'},
      {type: 'PLUGIN_SELECTED', time: 650, plugin: 'Layout'},
      {type: 'PLUGIN_SELECTED', time: 1050, plugin: 'Databases'},
    ],
  };
  const result = computeUsageSummary(state, 1550);
  expect(result).toReportTimeSpent('total', 1450, 0);
  expect(result).toReportTimeSpent('Layout', 600, 0);
  expect(result).toReportTimeSpent('Network', 300, 0);
  expect(result).toReportTimeSpent('Databases', 500, 0);
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toReportTimeSpent(
        plugin: string,
        focusedTimeSpent: number,
        unfocusedTimeSpent: number,
      ): R;
    }
  }
}

expect.extend({
  toReportTimeSpent(
    received: UsageSummary,
    plugin: string,
    focusedTimeSpent: number,
    unfocusedTimeSpent: number,
  ) {
    const focusedPass = received[plugin].focusedTime === focusedTimeSpent;
    const unfocusedPass = received[plugin].unfocusedTime === unfocusedTimeSpent;
    if (!focusedPass) {
      return {
        message: () =>
          `expected ${JSON.stringify(
            received,
          )} to have focused time spent: ${focusedTimeSpent} for plugin ${plugin}, but was ${
            received[plugin]?.focusedTime
          }`,
        pass: false,
      };
    }

    if (!unfocusedPass) {
      return {
        message: () =>
          `expected ${JSON.stringify(
            received,
          )} to have unfocused time spent: ${unfocusedTimeSpent} for plugin ${plugin}, but was ${
            received[plugin]?.unfocusedTime
          }`,
        pass: false,
      };
    }
    return {
      message: () =>
        `expected ${JSON.stringify(
          received,
        )} not to have focused time spent: ${focusedTimeSpent} and unfocused: ${unfocusedTimeSpent}`,
      pass: true,
    };
  },
});
