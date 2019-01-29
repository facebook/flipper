/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {shouldParseAndroidLog} from '../crashReporterUtility.js';
import type {DeviceLogEntry, LogLevel} from 'flipper';

function getAndroidLog(
  date: Date,
  type: LogLevel,
  tag: string,
  message: string,
): DeviceLogEntry {
  return {date, type, tag, message, app: 'testapp', pid: 0, tid: 0};
}

test('test shouldParseAndroidLog function for type error and tag has flipper mention', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'flipper.activitymanager',
    'Possible error',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
test('test shouldParseAndroidLog function for type non-error', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'debug',
    'flipper.activitymanager',
    'Possible debug info in flipper',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(false);
});
test('test shouldParseAndroidLog function for the older android log', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() - 10000), //This log arrives 10 secs before the refernce time
    'error',
    'flipper.activitymanager',
    'Possible error info in activitymanager',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(false);
});
test('test shouldParseAndroidLog function for the error log which does not staisfy our tags check', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'arbitrary tag',
    'Possible error info in activitymanager',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(false);
});
test('test shouldParseAndroidLog function for the error log which does not staisfy our tags check but has mention of flipper', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'arbitrary tag',
    'Possible error info in flipper',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
test('test shouldParseAndroidLog function for the error log which has flipper mentioned in the tag', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'arbitrary flipper tag',
    'Possible error info in facebook',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
test('test shouldParseAndroidLog function for the error log which has tag libfbjni', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'libfbjni',
    'Possible error info in libfbjni',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
test('test shouldParseAndroidLog function for the error log which has tag art', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'art',
    'Possible error info in wakizashi',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
test('test shouldParseAndroidLog function for the error log which has tag AndroidRuntime', () => {
  const referenceDate = new Date();
  let log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'AndroidRuntime',
    'Possible error info in app',
  );
  let shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(true);
});
