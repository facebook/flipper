/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  parseIosCrash,
  parsePath,
  shouldShowiOSCrashNotification,
} from '../iOSCrashUtils';

test('test the parsing of the date and crash info for the log which matches the predefined regex', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa Date/Time: 2019-03-21 12:07:00.861 +0000 \n Blaa balaaa';
  const crash = parseIosCrash(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('SIGSEGV');
  expect(crash.name).toEqual('SIGSEGV');
  expect(crash.date).toEqual(new Date('2019-03-21 12:07:00.861').getTime());
});

test('test the parsing of the reason for crash when log matches the crash regex, but there is no mention of date', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa';
  const crash = parseIosCrash(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('SIGSEGV');
  expect(crash.name).toEqual('SIGSEGV');
});

test('test the parsing of the crash log when log does not match the predefined regex but is alphanumeric', () => {
  const log = 'Blaa Blaaa \n Blaa Blaaa \n Blaa Blaaa';
  const crash = parseIosCrash(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
});

test('test the parsing of the reason for crash when log does not match the predefined regex contains unicode character', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  🍕🐬 \n Blaa Blaa \n Blaa Blaa';
  const crash = parseIosCrash(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
});
test('test the parsing of the reason for crash when log is empty', () => {
  const log = '';
  const crash = parseIosCrash(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
});

test('test the parsing of the Android crash log with os being iOS', () => {
  const log =
    'FATAL EXCEPTION: main\nProcess: com.facebook.flipper.sample, PID: 27026\njava.lang.IndexOutOfBoundsException: Index: 190, Size: 0\n\tat java.util.ArrayList.get(ArrayList.java:437)\n\tat com.facebook.flipper.sample.RootComponentSpec.hitGetRequest(RootComponentSpec.java:72)\n\tat com.facebook.flipper.sample.RootComponent.hitGetRequest(RootComponent.java:46)\n';
  const crash = parseIosCrash(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
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
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    'TH1S-15DEV1CE-1D',
    content,
  );
  expect(shouldShowNotification).toEqual(true);
});
test('test shouldShowiOSCrashNotification function for all correct inputs but incorrect id', () => {
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-1598DEV1CE-2D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    'TH1S-15DEV1CE-1D',
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
