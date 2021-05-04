/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import unicodeSubstring from 'unicode-substring';
import type {CrashLog} from './index';
import {parseAndroidCrash} from './android-crash-utils';
import {parseIosCrash} from './ios-crash-utils';

export const UNKNOWN_CRASH_REASON = 'Cannot figure out the cause';

export function parseCrashLog(
  content: string,
  os: string,
  logDate?: Date,
): CrashLog {
  const fallbackReason = UNKNOWN_CRASH_REASON;
  switch (os) {
    case 'iOS': {
      return parseIosCrash(content, fallbackReason, logDate);
    }
    case 'Android': {
      return parseAndroidCrash(content, fallbackReason, logDate);
    }
    default: {
      throw new Error('Unsupported OS');
    }
  }
}

export function truncate(baseString: string, numOfChars: number): string {
  if (baseString.length <= numOfChars) {
    return baseString;
  }
  const truncated_string = unicodeSubstring(baseString, 0, numOfChars - 1);
  return truncated_string + '\u2026';
}

export function trimCallStackIfPossible(callstack: string): string {
  const regex = /Application Specific Information:/;
  const query = regex.exec(callstack);
  return query ? callstack.substring(0, query.index) : callstack;
}
