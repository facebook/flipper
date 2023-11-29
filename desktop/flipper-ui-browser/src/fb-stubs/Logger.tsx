/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger, LoggerArgs, NoopLogger} from 'flipper-common';

const naiveLogger: Logger = {
  track(...args: [any, any, any?, any?]) {
    console.warn('(skipper track)', args);
  },
  trackTimeSince(...args: [any, any, any?]) {
    console.warn('(skipped trackTimeSince)', args);
  },
  debug(...args: any[]) {
    console.debug(...args);
  },
  error(...args: any[]) {
    console.error(...args);
    console.warn('(skipped error reporting)');
  },
  warn(...args: any[]) {
    console.warn(...args);
    console.warn('(skipped error reporting)');
  },
  info(...args: any[]) {
    console.info(...args);
  },
};

export function init(args?: LoggerArgs): Logger {
  if (args && args.isTest) {
    return new NoopLogger();
  } else {
    return naiveLogger;
  }
}
