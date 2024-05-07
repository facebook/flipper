/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {EnvironmentInfo, setLoggerInstance} from 'flipper-common';

import {initializeLogger as initializeLoggerCore} from './fb-stubs/Logger';

export const loggerOutputFile = 'flipper-server-log.out';

export async function initializeLogger(environmentInfo: EnvironmentInfo) {
  // Suppress stdout debug messages, but keep writing them to the file.
  console.debug = function () {};

  const logger = initializeLoggerCore(environmentInfo);
  setLoggerInstance(logger);
}
