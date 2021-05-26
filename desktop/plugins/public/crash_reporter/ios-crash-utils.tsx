/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Crash, CrashLog} from './index';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {UNKNOWN_CRASH_REASON} from './crash-utils';

export function parseIosCrash(content: string) {
  const regex = /Exception Type: *\w*/;
  const arr = regex.exec(content);
  const exceptionString = arr ? arr[0] : '';
  const exceptionRegex = /\w*$/;
  const tmp = exceptionRegex.exec(exceptionString);
  const exception = tmp && tmp[0].length ? tmp[0] : UNKNOWN_CRASH_REASON;

  const dateRegex = /Date\/Time: *[\w\s\.:-]*/;
  const dateArr = dateRegex.exec(content);
  const dateString = dateArr ? dateArr[0] : '';
  const dateRegex2 = /[\w\s\.:-]*$/;
  const tmp1 = dateRegex2.exec(dateString);
  const extractedDateString: string | null =
    tmp1 && tmp1[0].length ? tmp1[0] : null;
  const date = extractedDateString ? new Date(extractedDateString) : new Date();

  const crash: CrashLog = {
    callstack: content,
    name: exception,
    reason: exception,
    date,
  };
  return crash;
}

export function shouldShowiOSCrashNotification(
  serial: string,
  content: string,
): boolean {
  const appPath = parsePath(content);
  if (!appPath || !appPath.includes(serial)) {
    // Do not show notifications for the app which are not running on this device
    return false;
  }
  return true;
}

export function parsePath(content: string): string | null {
  const regex = /(?<=.*Path: *)[^\n]*/;
  const arr = regex.exec(content);
  if (!arr || arr.length <= 0) {
    return null;
  }
  const path = arr[0];
  return path.trim();
}

export function addFileWatcherForiOSCrashLogs(
  serial: string,
  reportCrash: (payload: CrashLog | Crash) => void,
) {
  const dir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');
  if (!fs.existsSync(dir)) {
    // Directory doesn't exist
    return;
  }
  return fs.watch(dir, (_eventType, filename) => {
    // We just parse the crash logs with extension `.crash`
    const checkFileExtension = /.crash$/.exec(filename);
    if (!filename || !checkFileExtension) {
      return;
    }
    const filepath = path.join(dir, filename);
    promisify(fs.exists)(filepath).then((exists) => {
      if (!exists) {
        return;
      }
      fs.readFile(filepath, 'utf8', function (err, data) {
        if (err) {
          console.warn('Failed to read crash file', err);
          return;
        }
        if (shouldShowiOSCrashNotification(serial, data)) {
          reportCrash(parseIosCrash(data));
        }
      });
    });
  });
}
