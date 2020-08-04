/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {DeviceLogEntry} from 'flipper-plugin';

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
