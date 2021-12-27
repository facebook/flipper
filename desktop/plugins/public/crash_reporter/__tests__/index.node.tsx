/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TestUtils, CrashLog} from 'flipper-plugin';
import * as CrashReporterPlugin from '../index';

test('test defaultPersistedState of CrashReporterPlugin', () => {
  expect(
    TestUtils.startDevicePlugin(CrashReporterPlugin).exportState(),
  ).toEqual({crashes: []});
});
test('test helper setdefaultPersistedState function', () => {
  const crash: CrashLog = {
    callstack: 'callstack',
    reason: 'crash0',
    name: 'crash0',
    date: Date.now(),
  };
  const plugin = TestUtils.startDevicePlugin(CrashReporterPlugin);
  plugin.instance.reportCrash(crash);
  expect(plugin.exportState()).toEqual({
    crashes: [
      {
        ...crash,
        notificationID: '0',
      },
    ],
  });
});
test('test getNewPersistedStateFromCrashLog for non-empty defaultPersistedState and defined pluginState', () => {
  const crash: CrashLog = {
    callstack: 'callstack',
    reason: 'crash0',
    name: 'crash0',
    date: Date.now(),
  };
  const plugin = TestUtils.startDevicePlugin(CrashReporterPlugin);
  plugin.instance.reportCrash(crash);
  const pluginStateCrash: CrashLog = {
    callstack: 'callstack',
    reason: 'crash1',
    name: 'crash1',
    date: Date.now(),
  };
  plugin.instance.reportCrash(pluginStateCrash);
  const crashes = plugin.instance.crashes.get();
  expect(crashes).toBeDefined();
  expect(crashes.length).toEqual(2);
  expect(crashes[1]).toEqual({
    ...pluginStateCrash,
    notificationID: '1',
  });
});
