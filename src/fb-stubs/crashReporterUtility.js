/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow
 */
import type {DeviceLogEntry} from '../devices/BaseDevice.js';

export function shouldParseAndroidLog(
  entry: DeviceLogEntry,
  date: Date,
): boolean {
  const tagsCheck =
    entry.tag === 'art' || // This tag is for jni errors from sample app
    entry.tag === 'AndroidRuntime' || // This tag is for runtime java errors
    entry.tag === 'libfbjni' || // Related to fbjni errors from flipper
    entry.tag.includes('flipper');

  const messagesCheck = entry.message.includes('flipper');

  return (
    entry.date.getTime() - date.getTime() > 0 && // The log should have arrived after the device has been registered
    entry.type === 'error' &&
    (tagsCheck || messagesCheck)
  );
}
