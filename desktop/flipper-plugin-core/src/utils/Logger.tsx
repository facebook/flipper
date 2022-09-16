/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger} from 'flipper-common';
export {Logger} from 'flipper-common';

export const stubLogger: Logger = {
  track() {},
  trackTimeSince() {},
  info() {
    // eslint-disable-next-line
    console.log.apply(console, arguments as any);
  },
  warn() {
    // eslint-disable-next-line
    console.warn.apply(console, arguments as any);
  },
  error() {
    // eslint-disable-next-line
    console.error.apply(console, arguments as any);
  },
  debug() {
    // eslint-disable-next-line
    console.debug.apply(console, arguments as any);
  },
};
