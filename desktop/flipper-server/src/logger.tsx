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
  addLogTailer,
  EnvironmentInfo,
  LoggerExtractError,
  LoggerFormat,
  LoggerTypes,
  setLoggerInstance,
} from 'flipper-common';
// @ts-expect-error
import fsRotator from 'file-stream-rotator';
import {ensureFile} from 'fs-extra';
import {access} from 'fs/promises';
import {constants} from 'fs';
import {initializeLogger as initializeLoggerCore} from './fb-stubs/Logger';
import {setProcessExitRoutine} from './utils/processExit';

export const loggerOutputFile = 'flipper-server-log.out';

export async function initializeLogger(
  environmentInfo: EnvironmentInfo,
  staticDir: string,
) {
  // Suppress stdout debug messages, but keep writing them to the file.
  console.debug = function () {};

  const logger = initializeLoggerCore(environmentInfo);
  setLoggerInstance(logger);

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

  addLogTailer((level: LoggerTypes, ...data: Array<any>) => {
    const logInfo = LoggerFormat(level, ...data);
    logStream?.write(`[${logInfo.time}][${logInfo.type}] ${logInfo.msg}\n`);

    if (level === 'error') {
      const {
        error: {stack, name},
      } = LoggerExtractError(data);

      logStream?.write(`${name}: \n${stack}\n`);
    }
  });

  const finalizeLogger = async () => {
    const logStreamToEnd = logStream;
    // Prevent future writes
    logStream = undefined;
    await new Promise<void>((resolve) => {
      logStreamToEnd?.end(resolve);
    });
  };
  setProcessExitRoutine(finalizeLogger);
}
