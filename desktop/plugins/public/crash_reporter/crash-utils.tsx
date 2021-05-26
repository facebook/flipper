/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import unicodeSubstring from 'unicode-substring';
import type {Crash} from './index';
import {DevicePluginClient} from 'flipper-plugin';

export const UNKNOWN_CRASH_REASON = 'Cannot figure out the cause';

function truncate(baseString: string, numOfChars: number): string {
  if (baseString.length <= numOfChars) {
    return baseString;
  }
  const truncated_string = unicodeSubstring(baseString, 0, numOfChars - 1);
  return truncated_string + '\u2026';
}

function trimCallStackIfPossible(callstack: string): string {
  const regex = /Application Specific Information:/;
  const query = regex.exec(callstack);
  return query ? callstack.substring(0, query.index) : callstack;
}

export function showCrashNotification(
  client: DevicePluginClient,
  crash: Crash,
) {
  const ignore = !crash.name && !crash.reason;
  const unknownCrashCause = crash.reason === UNKNOWN_CRASH_REASON;
  if (ignore || unknownCrashCause) {
    console.warn('Ignored the notification for the crash', crash);
    return;
  }

  let title: string = 'CRASH: ' + truncate(crash.name || crash.reason, 50);
  title = `${
    crash.name == crash.reason
      ? title
      : title + 'Reason: ' + truncate(crash.reason, 50)
  }`;
  const callstack = crash.callstack
    ? trimCallStackIfPossible(crash.callstack)
    : 'No callstack available';
  const msg = `Callstack: ${truncate(callstack, 200)}`;
  // TODO: fix client id
  client.showNotification({
    id: crash.notificationID,
    message: msg,
    severity: 'error',
    title: title,
    action: crash.notificationID,
    category: crash.reason || 'Unknown reason',
  });
}
