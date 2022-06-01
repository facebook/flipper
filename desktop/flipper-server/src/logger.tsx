/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as fs from 'fs-extra';
import path from 'path';
import {
  LoggerExtractError,
  LoggerFormat,
  LoggerInfo,
  LoggerTypes,
  Logger,
  setLoggerInstance,
} from 'flipper-common';

export const loggerOutputFile = 'flipper-server-log.out';

const logTypes: LoggerTypes[] = ['debug', 'info', 'warn', 'error'];

function createLogger(): Logger {
  return {
    track(..._args: [any, any, any?, any?]) {
      // TODO: only if verbose console.debug(...args);
      // console.warn('(skipper track)', args);
    },
    trackTimeSince(..._args: [any, any, any?]) {
      // TODO: only if verbose console.debug(...args);
      // console.warn('(skipped trackTimeSince)', args);
    },
    debug(...args: any[]) {
      console.debug(...args);
    },
    error(...args: any[]) {
      console.error(...args);
    },
    warn(...args: any[]) {
      console.warn(...args);
    },
    info(...args: any[]) {
      console.info(...args);
    },
  };
}

type FlipperLogProxy = (entry: LoggerInfo) => void;

const consoleProxy = (proxy: FlipperLogProxy) => {
  function log(level: LoggerTypes, ...data: Array<any>): void {
    const logInfo = LoggerFormat(level, ...data);
    proxy(logInfo);

    if (level === 'error') {
      const {
        message,
        error: {stack, interaction, name},
      } = LoggerExtractError(data);
      const logInfo = LoggerFormat(level, {
        name,
        stack,
        interaction,
        message,
      });
      proxy(logInfo);
    }
  }

  for (const method of logTypes) {
    const originalConsole: {[key: string]: any} = console;
    const originalMethod = originalConsole[method];
    const overrideMethod = (...args: Array<unknown>) => {
      const result = originalMethod(...args);
      log(method, ...args);
      return result;
    };
    originalConsole[method] = overrideMethod;
  }
};

export function initializeLogger(staticDir: string) {
  // Supress debug messages by default.
  console.debug = function () {};

  const logger = createLogger();
  setLoggerInstance(logger);

  const file = fs.createWriteStream(path.join(staticDir, loggerOutputFile));
  consoleProxy((entry: LoggerInfo) => {
    file.write(`${JSON.stringify(entry)}\n`);
  });
}
