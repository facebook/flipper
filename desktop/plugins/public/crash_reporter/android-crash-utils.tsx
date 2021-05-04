/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {DeviceLogEntry} from 'flipper-plugin';
import type {CrashLog} from './index';

export function parseAndroidCrash(
  content: string,
  fallbackReason: string,
  logDate?: Date,
) {
  const regForName = /.*\n/;
  const nameRegArr = regForName.exec(content);
  let name = nameRegArr ? nameRegArr[0] : fallbackReason;
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
      : fallbackReason;
  const reason = reasonText ? reasonText : fallbackReason;
  if (name[name.length - 1] === '\n') {
    name = name.slice(0, -1);
  }
  const crash: CrashLog = {
    callstack: content,
    name: name,
    reason: reason,
    date: logDate,
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
