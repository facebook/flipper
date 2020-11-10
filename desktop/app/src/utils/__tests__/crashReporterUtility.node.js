/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {shouldParseAndroidLog} from '../crashReporterUtility.tsx';
import type {DeviceLogEntry, LogLevel} from '../../';

function getAndroidLog(
  date: Date,
  type: LogLevel,
  tag: string,
  message: string,
): DeviceLogEntry {
  return {date, type, tag, message, app: 'testapp', pid: 0, tid: 0};
}

test('test shouldParseAndroidLog function for type error and tag is AndroidRuntime', () => {
  const referenceDate = new Date();
  const log: DeviceLogEntry = getAndroidLog(
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
  const log: DeviceLogEntry = getAndroidLog(
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
  const log: DeviceLogEntry = getAndroidLog(
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
  const log: DeviceLogEntry = getAndroidLog(
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
  const log: DeviceLogEntry = getAndroidLog(
    new Date(referenceDate.getTime() + 10000), //This log arrives 10 secs after the refernce time
    'error',
    'arbitrary tag',
    'Possible error info in fb4a',
  );
  const shouldParseTheLog = shouldParseAndroidLog(log, referenceDate);
  expect(shouldParseTheLog).toEqual(false);
});
