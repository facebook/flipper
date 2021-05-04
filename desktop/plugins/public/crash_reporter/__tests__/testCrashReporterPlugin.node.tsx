/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {BaseDevice} from 'flipper';
import {Crash} from '../index';
import {TestUtils} from 'flipper-plugin';
import {getPluginKey} from 'flipper';
import * as CrashReporterPlugin from '../index';
import {parseCrashLog} from '../crash-utils';
import {parsePath, shouldShowiOSCrashNotification} from '../ios-crash-utils';

function getCrash(
  id: number,
  callstack: string,
  name: string,
  reason: string,
): Crash {
  return {
    notificationID: id.toString(),
    callstack: callstack,
    reason: reason,
    name: name,
    date: new Date(),
  };
}

function assertCrash(crash: Crash, expectedCrash: Crash) {
  const {notificationID, callstack, reason, name, date} = crash;
  expect(notificationID).toEqual(expectedCrash.notificationID);
  expect(callstack).toEqual(expectedCrash.callstack);
  expect(reason).toEqual(expectedCrash.reason);
  expect(name).toEqual(expectedCrash.name);
  expect(date.toDateString()).toEqual(expectedCrash.date.toDateString());
}

test('test the parsing of the date and crash info for the log which matches the predefined regex', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa Date/Time: 2019-03-21 12:07:00.861 +0000 \n Blaa balaaa';
  const crash = parseCrashLog(log, 'iOS', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('SIGSEGV');
  expect(crash.name).toEqual('SIGSEGV');
  expect(crash.date).toEqual(new Date('2019-03-21 12:07:00.861'));
});

test('test the parsing of the reason for crash when log matches the crash regex, but there is no mention of date', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa';
  const crash = parseCrashLog(log, 'iOS', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('SIGSEGV');
  expect(crash.name).toEqual('SIGSEGV');
  expect(crash.date).toBeUndefined();
});

test('test the parsing of the crash log when log does not match the predefined regex but is alphanumeric', () => {
  const log = 'Blaa Blaaa \n Blaa Blaaa \n Blaa Blaaa';
  const crash = parseCrashLog(log, 'iOS', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
});

test('test the parsing of the reason for crash when log does not match the predefined regex contains unicode character', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  🍕🐬 \n Blaa Blaa \n Blaa Blaa';
  const crash = parseCrashLog(log, 'iOS', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
  expect(crash.date).toBeUndefined();
});
test('test the parsing of the reason for crash when log is empty', () => {
  const log = '';
  const crash = parseCrashLog(log, 'iOS', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
  expect(crash.date).toBeUndefined();
});
test('test the parsing of the Android crash log for the proper android crash format', () => {
  const log =
    'FATAL EXCEPTION: main\nProcess: com.facebook.flipper.sample, PID: 27026\njava.lang.IndexOutOfBoundsException: Index: 190, Size: 0\n\tat java.util.ArrayList.get(ArrayList.java:437)\n\tat com.facebook.flipper.sample.RootComponentSpec.hitGetRequest(RootComponentSpec.java:72)\n\tat com.facebook.flipper.sample.RootComponent.hitGetRequest(RootComponent.java:46)\n';
  const date = new Date();
  const crash = parseCrashLog(log, 'Android', date);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual(
    'java.lang.IndexOutOfBoundsException: Index: 190, Size: 0',
  );
  expect(crash.name).toEqual('FATAL EXCEPTION: main');
  expect(crash.date).toEqual(date);
});
test('test the parsing of the Android crash log for the unknown crash format and no date', () => {
  const log = 'Blaa Blaa Blaa';
  const crash = parseCrashLog(log, 'Android', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
  expect(crash.date).toBeUndefined();
});
test('test the parsing of the Android crash log for the partial format matching the crash format', () => {
  const log = 'First Line Break \n Blaa Blaa \n Blaa Blaa ';
  const crash = parseCrashLog(log, 'Android', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('First Line Break ');
});
test('test the parsing of the Android crash log with os being iOS', () => {
  const log =
    'FATAL EXCEPTION: main\nProcess: com.facebook.flipper.sample, PID: 27026\njava.lang.IndexOutOfBoundsException: Index: 190, Size: 0\n\tat java.util.ArrayList.get(ArrayList.java:437)\n\tat com.facebook.flipper.sample.RootComponentSpec.hitGetRequest(RootComponentSpec.java:72)\n\tat com.facebook.flipper.sample.RootComponent.hitGetRequest(RootComponent.java:46)\n';
  const crash = parseCrashLog(log, 'iOS', undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
});
test('test the getter of pluginKey with proper input', () => {
  const device = new BaseDevice('serial', 'emulator', 'test device', 'iOS');
  const pluginKey = getPluginKey(null, device, 'CrashReporter');
  expect(pluginKey).toEqual('serial#CrashReporter');
});
test('test the getter of pluginKey with undefined input', () => {
  const pluginKey = getPluginKey(null, null, 'CrashReporter');
  expect(pluginKey).toEqual('unknown#CrashReporter');
});
test('test the getter of pluginKey with defined selected app', () => {
  const pluginKey = getPluginKey('selectedApp', null, 'CrashReporter');
  expect(pluginKey).toEqual('selectedApp#CrashReporter');
});
test('test the getter of pluginKey with defined selected app and defined base device', () => {
  const device = new BaseDevice('serial', 'emulator', 'test device', 'iOS');
  const pluginKey = getPluginKey('selectedApp', device, 'CrashReporter');
  expect(pluginKey).toEqual('selectedApp#CrashReporter');
});
test('test defaultPersistedState of CrashReporterPlugin', () => {
  expect(
    TestUtils.startDevicePlugin(CrashReporterPlugin).exportState(),
  ).toEqual({crashes: []});
});
test('test helper setdefaultPersistedState function', () => {
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  const plugin = TestUtils.startDevicePlugin(CrashReporterPlugin);
  plugin.instance.reportCrash(crash);
  expect(plugin.exportState()).toEqual({crashes: [crash]});
});
test('test getNewPersistedStateFromCrashLog for non-empty defaultPersistedState and defined pluginState', () => {
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  const plugin = TestUtils.startDevicePlugin(CrashReporterPlugin);
  plugin.instance.reportCrash(crash);
  const pluginStateCrash = getCrash(1, 'callstack', 'crash1', 'crash1');
  plugin.instance.reportCrash(pluginStateCrash);
  const crashes = plugin.instance.crashes.get();
  expect(crashes).toBeDefined();
  expect(crashes.length).toEqual(2);
  expect(crashes[1]).toEqual(pluginStateCrash);
});

test('test getNewPersistedStateFromCrashLog for non-empty defaultPersistedState and defined pluginState and improper crash log', () => {
  const plugin = TestUtils.startDevicePlugin(CrashReporterPlugin);
  const pluginStateCrash = getCrash(0, 'callstack', 'crash1', 'crash1');
  plugin.instance.reportCrash(pluginStateCrash);
  const content = 'Blaa Blaaa \n Blaa Blaaa';
  plugin.instance.reportCrash(parseCrashLog(content, 'iOS', undefined));
  const crashes = plugin.instance.crashes.get();
  expect(crashes.length).toEqual(2);
  assertCrash(crashes[0], pluginStateCrash);
  assertCrash(
    crashes[1],
    getCrash(
      1,
      content,
      'Cannot figure out the cause',
      'Cannot figure out the cause',
    ),
  );
});

test('test getNewPersistedStateFromCrashLog when os is undefined', () => {
  const plugin = TestUtils.startDevicePlugin(CrashReporterPlugin);
  const content = 'Blaa Blaaa \n Blaa Blaaa';
  expect(() => {
    plugin.instance.reportCrash(
      parseCrashLog(content, undefined as any, undefined),
    );
  }).toThrowErrorMatchingInlineSnapshot(`"Unsupported OS"`);
  const crashes = plugin.instance.crashes.get();
  expect(crashes.length).toEqual(0);
});

test('test parsing of path when inputs are correct', () => {
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/AppName.app/AppName \n Blaa Blaa \n Blaa Blaa';
  const id = parsePath(content);
  expect(id).toEqual('path/to/simulator/TH1S-15DEV1CE-1D/AppName.app/AppName');
});
test('test parsing of path when path has special characters in it', () => {
  let content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  let id = parsePath(content);
  expect(id).toEqual(
    'path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name',
  );
  content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App_Name.app/App_Name \n Blaa Blaa \n Blaa Blaa';
  id = parsePath(content);
  expect(id).toEqual(
    'path/to/simulator/TH1S-15DEV1CE-1D/App_Name.app/App_Name',
  );
  content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App%20Name.app/App%20Name \n Blaa Blaa \n Blaa Blaa';
  id = parsePath(content);
  expect(id).toEqual(
    'path/to/simulator/TH1S-15DEV1CE-1D/App%20Name.app/App%20Name',
  );
});
test('test parsing of path when a regex is not present', () => {
  const content = 'Blaa Blaaa \n Blaa Blaaa \n Blaa Blaa \n Blaa Blaa';
  const id = parsePath(content);
  expect(id).toEqual(null);
});

test('test shouldShowCrashNotification function for all correct inputs', () => {
  const device = new BaseDevice(
    'TH1S-15DEV1CE-1D',
    'emulator',
    'test device',
    'iOS',
  );
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    device.serial,
    content,
  );
  expect(shouldShowNotification).toEqual(true);
});
test('test shouldShowiOSCrashNotification function for all correct inputs but incorrect id', () => {
  const device = new BaseDevice(
    'TH1S-15DEV1CE-1D',
    'emulator',
    'test device',
    'iOS',
  );
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-1598DEV1CE-2D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    device.serial,
    content,
  );
  expect(shouldShowNotification).toEqual(false);
});
test('test shouldShowiOSCrashNotification function for undefined device', () => {
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-1598DEV1CE-2D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    null as any,
    content,
  );
  expect(shouldShowNotification).toEqual(false);
});

test('only crashes from the correct device are picked up', () => {
  const serial = 'AC9482A2-26A4-404F-A179-A9FB60B077F6';
  const crash = `Process:               Sample [87361]
  Path:                  /Users/USER/Library/Developer/CoreSimulator/Devices/AC9482A2-26A4-404F-A179-A9FB60B077F6/data/Containers/Bundle/Application/9BF91EF9-F915-4745-BE91-EBA397451850/Sample.app/Sample
  Identifier:            Sample
  Version:               1.0 (1)
  Code Type:             X86-64 (Native)
  Parent Process:        launchd_sim [70150]
  Responsible:           SimulatorTrampoline [1246]
  User ID:               501`;

  expect(shouldShowiOSCrashNotification(serial, crash)).toBe(true);
  // wrong serial
  expect(
    shouldShowiOSCrashNotification(
      'XC9482A2-26A4-404F-A179-A9FB60B077F6',
      crash,
    ),
  ).toBe(false);
});
