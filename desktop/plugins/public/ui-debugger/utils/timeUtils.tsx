/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {options} from '../components/sidebar/inspector/FrameworkEventsInspector';

export function formatTimestampMillis(timestamp: number): string {
  const date = new Date(timestamp);

  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
  const milliseconds = date.getMilliseconds();

  return `${formattedDate}.${milliseconds.toString().padStart(3, '0')}`;
}

export function formatDuration(nanoseconds: number): string {
  if (nanoseconds < 1_000) {
    return `${nanoseconds} nanoseconds`;
  } else if (nanoseconds < 1_000_000) {
    return `${(nanoseconds / 1_000).toFixed(2)} microseconds`;
  } else if (nanoseconds < 1_000_000_000) {
    return `${(nanoseconds / 1_000_000).toFixed(2)} milliseconds`;
  } else if (nanoseconds < 1_000_000_000_000) {
    return `${(nanoseconds / 1_000_000_000).toFixed(2)} seconds`;
  } else {
    return `${(nanoseconds / (1_000_000_000 * 60)).toFixed(2)} minutes`;
  }
}
