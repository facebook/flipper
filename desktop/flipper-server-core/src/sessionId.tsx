/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {uuid} from 'flipper-common';

if (process.env.FLIPPER_SESSION_ID) {
  console.info('Use external session ID', process.env.FLIPPER_SESSION_ID);
}
export const sessionId = `${
  process.env.FLIPPER_SESSION_ID ?? 'unset'
}::${uuid()}`;
