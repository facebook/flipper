/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  parseIosCrashLegacy,
  parsePathLegacy,
  shouldShowiOSCrashNotification,
} from '../iOSCrashUtils';

const modernCrashReportPartial = `{"app_name":"Sample","timestamp":"2022-08-02 16:00:06.00 +0100","app_version":"1.0","slice_uuid":"6f0b8b0f-45d8-3a37-9f85-f1b07ccc121e","build_version":"1","platform":7,"bundleID":"com.facebook.flipper","share_with_app_devs":0,"is_first_party":0,"bug_type":"309","os_version":"macOS 12.4 (21F79)","incident_id":"DEE97E5A-409F-472F-96BC-E6B2D3FBB84B","name":"Sample"}
{
  "uptime" : 560000,
  "procLaunch" : "2022-08-02 16:00:04.3267 +0100",
  "procRole" : "Foreground",
  "version" : 2,
  "userID" : 501,
  "deployVersion" : 210,
  "modelCode" : "MacPro7,1",
  "procStartAbsTime" : 568274646258426,
  "coalitionID" : 260443,
  "osVersion" : {
    "train" : "macOS 12.4",
    "build" : "21F79",
    "releaseType" : "User"
  },
  "captureTime" : "2022-08-02 16:00:06.4551 +0100",
  "incident" : "DEE97E5A-409F-472F-96BC-E6B2D3FBB84B",
  "bug_type" : "309",
  "pid" : 59618,
  "procExitAbsTime" : 568276773623039,
  "cpuType" : "X86-64",
  "procName" : "Sample",
  "procPath" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/543083BF-313B-422B-A817-377078C830AF\/data\/Containers\/Bundle\/Application\/22053C61-10A5-49AE-9B09-00B0B9EAC36B\/Sample.app\/Sample",
}`;

test('test the parsing of the date and crash info for the log which matches the predefined regex', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa Date/Time: 2019-03-21 12:07:00.861 +0000 \n Blaa balaaa';
  const crash = parseIosCrashLegacy(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('SIGSEGV');
  expect(crash.name).toEqual('SIGSEGV');
  expect(crash.date).toEqual(new Date('2019-03-21 12:07:00.861').getTime());
});

test('test the parsing of the reason for crash when log matches the crash regex, but there is no mention of date', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa';
  const crash = parseIosCrashLegacy(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('SIGSEGV');
  expect(crash.name).toEqual('SIGSEGV');
});

test('test the parsing of the crash log when log does not match the predefined regex but is alphanumeric', () => {
  const log = 'Blaa Blaaa \n Blaa Blaaa \n Blaa Blaaa';
  const crash = parseIosCrashLegacy(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
});

test('test the parsing of the reason for crash when log does not match the predefined regex contains unicode character', () => {
  const log =
    'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  🍕🐬 \n Blaa Blaa \n Blaa Blaa';
  const crash = parseIosCrashLegacy(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
});
test('test the parsing of the reason for crash when log is empty', () => {
  const log = '';
  const crash = parseIosCrashLegacy(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
});

test('test the parsing of the Android crash log with os being iOS', () => {
  const log =
    'FATAL EXCEPTION: main\nProcess: com.facebook.flipper.sample, PID: 27026\njava.lang.IndexOutOfBoundsException: Index: 190, Size: 0\n\tat java.util.ArrayList.get(ArrayList.java:437)\n\tat com.facebook.flipper.sample.RootComponentSpec.hitGetRequest(RootComponentSpec.java:72)\n\tat com.facebook.flipper.sample.RootComponent.hitGetRequest(RootComponent.java:46)\n';
  const crash = parseIosCrashLegacy(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
});

test('test parsing of path when inputs are correct', () => {
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/AppName.app/AppName \n Blaa Blaa \n Blaa Blaa';
  const id = parsePathLegacy(content);
  expect(id).toEqual('path/to/simulator/TH1S-15DEV1CE-1D/AppName.app/AppName');
});
test('test parsing of path when path has special characters in it', () => {
  let content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  let id = parsePathLegacy(content);
  expect(id).toEqual(
    'path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name',
  );
  content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App_Name.app/App_Name \n Blaa Blaa \n Blaa Blaa';
  id = parsePathLegacy(content);
  expect(id).toEqual(
    'path/to/simulator/TH1S-15DEV1CE-1D/App_Name.app/App_Name',
  );
  content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App%20Name.app/App%20Name \n Blaa Blaa \n Blaa Blaa';
  id = parsePathLegacy(content);
  expect(id).toEqual(
    'path/to/simulator/TH1S-15DEV1CE-1D/App%20Name.app/App%20Name',
  );
});
test('test parsing of path when a regex is not present', () => {
  const content = 'Blaa Blaaa \n Blaa Blaaa \n Blaa Blaa \n Blaa Blaa';
  const id = parsePathLegacy(content);
  expect(id).toEqual(null);
});

test('test shouldShowCrashNotification function for all correct inputs', () => {
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    'TH1S-15DEV1CE-1D',
    content,
    true,
  );
  expect(shouldShowNotification).toEqual(true);
});
test('test shouldShowiOSCrashNotification function for all correct inputs but incorrect id', () => {
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-1598DEV1CE-2D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    'TH1S-15DEV1CE-1D',
    content,
    true,
  );
  expect(shouldShowNotification).toEqual(false);
});
test('test shouldShowiOSCrashNotification function for undefined device', () => {
  const content =
    'Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-1598DEV1CE-2D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa';
  const shouldShowNotification = shouldShowiOSCrashNotification(
    null as any,
    content,
    true,
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

  expect(shouldShowiOSCrashNotification(serial, crash, true)).toBe(true);
  // wrong serial
  expect(
    shouldShowiOSCrashNotification(
      'XC9482A2-26A4-404F-A179-A9FB60B077F6',
      crash,
      true,
    ),
  ).toBe(false);
});

test('modern crashes from the correct device are picked up', () => {
  const serial = '543083BF-313B-422B-A817-377078C830AF';

  expect(
    shouldShowiOSCrashNotification(serial, modernCrashReportPartial, false),
  ).toBe(true);
  // wrong serial
  expect(
    shouldShowiOSCrashNotification(
      'XC9482A2-26A4-404F-A179-A9FB60B077F6',
      modernCrashReportPartial,
      false,
    ),
  ).toBe(false);
});
