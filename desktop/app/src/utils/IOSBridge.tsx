/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import child_process from 'child_process';

export interface IOSBridge {
  startLogListener: (
    udid: string,
  ) => child_process.ChildProcessWithoutNullStreams;
}

async function isAvailable(idbPath: string): Promise<boolean> {
  if (!idbPath) {
    return false;
  }
  return fs.promises
    .access(idbPath, fs.constants.X_OK)
    .then((_) => true)
    .catch((_) => false);
}

const LOG_EXTRA_ARGS = [
  '--style',
  'json',
  '--predicate',
  'senderImagePath contains "Containers"',
  '--debug',
  '--info',
];

function idbStartLogListener(
  idbPath: string,
  udid: string,
): child_process.ChildProcessWithoutNullStreams {
  return child_process.spawn(
    idbPath,
    ['log', '--udid', udid, '--', ...LOG_EXTRA_ARGS],
    {},
  );
}

function xcrunStartLogListener(udid: string) {
  const deviceSetPath = process.env.DEVICE_SET_PATH
    ? ['--set', process.env.DEVICE_SET_PATH]
    : [];
  return child_process.spawn(
    'xcrun',
    [
      'simctl',
      ...deviceSetPath,
      'spawn',
      udid,
      'log',
      'stream',
      ...LOG_EXTRA_ARGS,
    ],
    {},
  );
}

export async function makeIOSBridge(idbPath: string): Promise<IOSBridge> {
  if (await isAvailable(idbPath)) {
    return {
      startLogListener: idbStartLogListener.bind(null, idbPath),
    };
  }

  return {
    startLogListener: xcrunStartLogListener,
  };
}
