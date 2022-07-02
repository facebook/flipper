/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {
  LoggerExtractError,
  LoggerFormat,
  LoggerInfo,
  LoggerTypes,
  Logger,
  setLoggerInstance,
} from 'flipper-common';
// @ts-expect-error
import fsRotator from 'file-stream-rotator';
import {ensureFile} from 'fs-extra';
import {access} from 'fs/promises';
import {constants} from 'fs';

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

export async function initializeLogger(staticDir: string) {
  // Suppress stdout debug messages, but keep writing them to the file.
  console.debug = function () {};

  const logger = createLogger();
  setLoggerInstance(logger);

  let onConsoleEntry: ((entry: LoggerInfo) => void) | undefined;

  const logFilename = path.join(staticDir, loggerOutputFile);

  let logStream: NodeJS.WriteStream | undefined = undefined;
  try {
    await ensureFile(logFilename);
    await access(logFilename, constants.W_OK);
    logStream = fsRotator.getStream({
      // Rotation number is going to be added after the file name
      filename: logFilename,
      // Rotate every 1MB
      size: '1m',
      // Keep last 5 rotations
      max_logs: 20,
    });
  } catch (e) {
    console.warn('initializeLogger -> cannot write logs to FS', e);
  }

  consoleProxy((entry: LoggerInfo) => {
    logStream?.write(`${JSON.stringify(entry)}\n`);
    onConsoleEntry?.(entry);
  });

  return (newOnConsoleEntry: (entry: LoggerInfo) => void) => {
    onConsoleEntry = newOnConsoleEntry;
  };
}
