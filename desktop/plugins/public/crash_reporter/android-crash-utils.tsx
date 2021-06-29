/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {DeviceLogEntry, DevicePluginClient} from 'flipper-plugin';
import {UNKNOWN_CRASH_REASON} from './crash-utils';
import type {CrashLog} from './index';

export function parseAndroidCrash(content: string, logDate?: Date) {
  const regForName = /.*\n/;
  const nameRegArr = regForName.exec(content);
  let name = nameRegArr ? nameRegArr[0] : UNKNOWN_CRASH_REASON;
  const regForCallStack = /\tat[\w\s\n\.$&+,:;=?@#|'<>.^*()%!-]*$/;
  const callStackArray = regForCallStack.exec(content);
  const callStack = callStackArray ? callStackArray[0] : '';
  let remainingString =
    callStack.length > 0 ? content.replace(callStack, '') : '';
  if (remainingString[remainingString.length - 1] === '\n') {
    remainingString = remainingString.slice(0, -1);
  }
  const reasonText =
    remainingString.length > 0
      ? remainingString.split('\n').pop()
      : UNKNOWN_CRASH_REASON;
  const reason = reasonText ? reasonText : UNKNOWN_CRASH_REASON;
  if (name[name.length - 1] === '\n') {
    name = name.slice(0, -1);
  }
  const crash: CrashLog = {
    callstack: content,
    name: name,
    reason: reason,
    date: logDate?.getTime(),
  };
  return crash;
}

export function shouldParseAndroidLog(
  entry: DeviceLogEntry,
  date: Date,
): boolean {
  return (
    entry.date.getTime() - date.getTime() > 0 && // The log should have arrived after the device has been registered
    ((entry.type === 'error' && entry.tag === 'AndroidRuntime') ||
      entry.type === 'fatal')
  );
}

export function startAndroidCrashWatcher(
  client: DevicePluginClient,
  reportCrash: (payload: CrashLog) => void,
) {
  const referenceDate = new Date();
  let androidLog: string = '';
  let androidLogUnderProcess = false;
  let timer: null | NodeJS.Timeout = null;
  client.device.onLogEntry((entry: DeviceLogEntry) => {
    if (shouldParseAndroidLog(entry, referenceDate)) {
      if (androidLogUnderProcess) {
        androidLog += '\n' + entry.message;
        androidLog = androidLog.trim();
        if (timer) {
          clearTimeout(timer);
        }
      } else {
        androidLog = entry.message;
        androidLogUnderProcess = true;
      }
      timer = setTimeout(() => {
        if (androidLog.length > 0) {
          reportCrash(parseAndroidCrash(androidLog, entry.date));
        }
        androidLogUnderProcess = false;
        androidLog = '';
      }, 50);
    }
  });
}
