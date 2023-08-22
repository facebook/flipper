/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {LoggerTypes} from './Logger';

export const logLevels: LoggerTypes[] = ['debug', 'info', 'warn', 'error'];
export type LogTailer = (level: LoggerTypes, ...data: Array<any>) => void;

const logTailers: LogTailer[] = [];
let initialized = false;

export function addLogTailer(handler: LogTailer) {
  logTailers.push(handler);
}

export function initLogTailer() {
  if (initialized) {
    return;
  }

  initialized = true;

  const originalConsole: {[key: string]: any} = console;
  // Store the raw console log functions here
  const originalConsoleLogFunctions: {[key: string]: (...args: any) => void} =
    {} as {
      [key: string]: (...args: any) => void;
    };

  // React Devtools also patches the console methods:
  // https://github.com/facebook/react/blob/206d61f72214e8ae5b935f0bf8628491cb7f0797/packages/react-devtools-shared/src/backend/console.js#L141
  // Not using a proxy object here because it isn't compatible with their patching process.
  // Instead replace the methods on the console itself.
  // Doesn't matter who patches first, single thread means it will be consistent.
  for (const level of logLevels) {
    const originalConsoleLogFunction = originalConsole[level];
    originalConsoleLogFunctions[level] = originalConsoleLogFunction;
    const overrideMethod = (...args: Array<unknown>) => {
      const newConsoleLogFunction = originalConsoleLogFunctions[level];
      const result = newConsoleLogFunction(...args);
      logTailers.forEach((handler) => {
        handler(level, ...args);
      });
      return result;
    };

    overrideMethod.__FLIPPER_ORIGINAL_METHOD__ = originalConsoleLogFunction;
    originalConsole[level] = overrideMethod;
  }
}
