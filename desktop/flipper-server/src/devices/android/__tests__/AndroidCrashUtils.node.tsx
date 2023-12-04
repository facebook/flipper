/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceLogEntry} from 'flipper-plugin';
import {parseAndroidCrash, shouldParseAndroidLog} from '../AndroidCrashUtils';

function getAndroidLog(
  date: Date,
  type: DeviceLogEntry['type'],
  tag: string,
  message: string,
): DeviceLogEntry {
  return {date, type, tag, message, pid: 0, tid: 0};
}

test('test shouldParseAndroidLog function for type error and tag is AndroidRuntime', () => {
  const referenceDate = new Date();
  const log = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'AndroidRuntime',
    'Possible runtime crash',
  );
  const shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
test('test shouldParseAndroidLog function for type non-error', () => {
  const referenceDate = new Date();
  const log = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'debug',
    'fb4a.activitymanager',
    'Possible debug info in activitymanager',
  );
  const shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(false);
});
test('test shouldParseAndroidLog function for the older android log', () => {
  const referenceDate = new Date();
  const log = getAndroidLog(
    new Date(referenceDate.getTime() - 10000), //This log arrives 10 secs before the refernce time
    'error',
    'fb4a.activitymanager',
    'Possible error info in activitymanager',
  );
  const shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(false);
});
test('test shouldParseAndroidLog function for the fatal log', () => {
  const referenceDate = new Date();
  const log = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'fatal',
    'arbitrary tag',
    'Possible error info in activitymanager',
  );
  const shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
test('test shouldParseAndroidLog function for the error log which does not staisfy our tags check', () => {
  const referenceDate = new Date();
  const log = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'arbitrary tag',
    'Possible error info in fb4a',
  );
  const shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(false);
});
test('test the parsing of the Android crash log for the proper android crash format', () => {
  const log =
    'FATAL EXCEPTION: main\nProcess: com.facebook.flipper.sample, PID: 27026\njava.lang.IndexOutOfBoundsException: Index: 190, Size: 0\n\tat java.util.ArrayList.get(ArrayList.java:437)\n\tat com.facebook.flipper.sample.RootComponentSpec.hitGetRequest(RootComponentSpec.java:72)\n\tat com.facebook.flipper.sample.RootComponent.hitGetRequest(RootComponent.java:46)\n';
  const date = new Date();
  const crash = parseAndroidCrash(log, date);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual(
    'java.lang.IndexOutOfBoundsException: Index: 190, Size: 0',
  );
  expect(crash.name).toEqual('FATAL EXCEPTION: main');
  expect(crash.date).toEqual(date.getTime());
});
test('test the parsing of the Android crash log for the unknown crash format and no date', () => {
  const log = 'Blaa Blaa Blaa';
  const crash = parseAndroidCrash(log, undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('Unknown');
  expect(crash.date).toBeUndefined();
});
test('test the parsing of the Android crash log for the partial format matching the crash format', () => {
  const log = 'First Line Break \n Blaa Blaa \n Blaa Blaa ';
  const crash = parseAndroidCrash(log, undefined);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Unknown');
  expect(crash.name).toEqual('First Line Break ');
});
