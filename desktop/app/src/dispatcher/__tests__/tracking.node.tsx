/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {computeUsageSummary} from '../tracking';
import {SelectedPluginData, State} from '../../reducers/usageTracking';
import BaseDevice from '../../devices/BaseDevice';
import {getPluginKey} from '../../utils/pluginUtils';

const device = new BaseDevice('serial', 'emulator', 'test device', 'iOS');
const layoutPluginKey = getPluginKey('Facebook', device, 'Layout');
const networkPluginKey = getPluginKey('Facebook', device, 'Network');
const databasesPluginKey = getPluginKey('Facebook', device, 'Databases');
const pluginData: SelectedPluginData = {
  plugin: 'Layout',
  app: 'Facebook',
  device: 'test device',
  deviceName: 'test device',
  deviceSerial: 'serial',
  deviceType: 'emulator',
  os: 'iOS',
  archived: false,
};
const pluginData2 = {...pluginData, plugin: 'Network'};
const pluginData3 = {...pluginData, plugin: 'Databases'};

test('Never focused', () => {
  const state: State = {
    timeline: [{type: 'TIMELINE_START', time: 100, isFocused: false}],
  };
  const result = computeUsageSummary(state, 200);
  expect(result.total).toReportTimeSpent('total', 0, 100);
});

test('Always focused', () => {
  const state: State = {
    timeline: [{type: 'TIMELINE_START', time: 100, isFocused: true}],
  };
  const result = computeUsageSummary(state, 200);
  expect(result.total).toReportTimeSpent('total', 100, 0);
});

test('Focused then unfocused', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {type: 'WINDOW_FOCUS_CHANGE', time: 150, isFocused: false},
    ],
  };
  const result = computeUsageSummary(state, 350);
  expect(result.total).toReportTimeSpent('total', 50, 200);
});

test('Unfocused then focused', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: false},
      {type: 'WINDOW_FOCUS_CHANGE', time: 150, isFocused: true},
    ],
  };
  const result = computeUsageSummary(state, 350);
  expect(result.total).toReportTimeSpent('total', 200, 50);
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
  expect(result.total).toReportTimeSpent('total', 200, 350);
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
  expect(result.total).toReportTimeSpent('total', 350, 200);
});

test('Always focused plugin change', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {
        type: 'PLUGIN_SELECTED',
        time: 150,
        pluginKey: layoutPluginKey,
        pluginData,
      },
    ],
  };
  const result = computeUsageSummary(state, 200);
  expect(result.total).toReportTimeSpent('total', 100, 0);
  expect(result.plugin[layoutPluginKey]).toReportTimeSpent('Layout', 50, 0);
});

test('Focused then plugin change then unfocusd', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {
        type: 'PLUGIN_SELECTED',
        time: 150,
        pluginKey: layoutPluginKey,
        pluginData,
      },
      {type: 'WINDOW_FOCUS_CHANGE', time: 350, isFocused: false},
    ],
  };
  const result = computeUsageSummary(state, 650);
  expect(result.total).toReportTimeSpent('total', 250, 300);
  expect(result.plugin[layoutPluginKey]).toReportTimeSpent('Layout', 200, 300);
});

test('Multiple plugin changes', () => {
  const state: State = {
    timeline: [
      {type: 'TIMELINE_START', time: 100, isFocused: true},
      {
        type: 'PLUGIN_SELECTED',
        time: 150,
        pluginKey: layoutPluginKey,
        pluginData,
      },
      {
        type: 'PLUGIN_SELECTED',
        time: 350,
        pluginKey: networkPluginKey,
        pluginData: pluginData2,
      },
      {
        type: 'PLUGIN_SELECTED',
        time: 650,
        pluginKey: layoutPluginKey,
        pluginData,
      },
      {
        type: 'PLUGIN_SELECTED',
        time: 1050,
        pluginKey: databasesPluginKey,
        pluginData: pluginData3,
      },
    ],
  };
  const result = computeUsageSummary(state, 1550);
  expect(result.total).toReportTimeSpent('total', 1450, 0);
  expect(result.plugin[layoutPluginKey]).toReportTimeSpent('Layout', 600, 0);
  expect(result.plugin[networkPluginKey]).toReportTimeSpent('Network', 300, 0);
  expect(result.plugin[databasesPluginKey]).toReportTimeSpent(
    'Databases',
    500,
    0,
  );
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
    received: {focusedTime: number; unfocusedTime: number} | undefined,
    plugin: string,
    focusedTimeSpent: number,
    unfocusedTimeSpent: number,
  ) {
    if (!received) {
      return {
        message: () =>
          `expected to have tracking element for plugin ${plugin}, but was not found`,
        pass: false,
      };
    }
    const focusedPass = received.focusedTime === focusedTimeSpent;
    const unfocusedPass = received.unfocusedTime === unfocusedTimeSpent;
    if (!focusedPass) {
      return {
        message: () =>
          `expected ${JSON.stringify(
            received,
          )} to have focused time spent: ${focusedTimeSpent} for plugin ${plugin}, but was ${
            received.focusedTime
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
            received.unfocusedTime
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
