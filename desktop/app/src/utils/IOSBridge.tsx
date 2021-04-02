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
import {DeviceType} from 'flipper-plugin-lib';

export interface IOSBridge {
  idbAvailable: boolean;
  startLogListener?: (
    udid: string,
    deviceType: DeviceType,
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

function getLogExtraArgs(deviceType: DeviceType) {
  if (deviceType === 'physical') {
    return [
      // idb has a --json option, but that doesn't actually work!
    ];
  } else {
    return [
      '--style',
      'json',
      '--predicate',
      'senderImagePath contains "Containers"',
      '--debug',
      '--info',
    ];
  }
}

export function idbStartLogListener(
  idbPath: string,
  udid: string,
  deviceType: DeviceType,
): child_process.ChildProcessWithoutNullStreams {
  return child_process.spawn(
    idbPath,
    ['log', '--udid', udid, '--', ...getLogExtraArgs(deviceType)],
    {},
  );
}

export function xcrunStartLogListener(udid: string, deviceType: DeviceType) {
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
      ...getLogExtraArgs(deviceType),
    ],
    {},
  );
}

export async function makeIOSBridge(
  idbPath: string,
  isXcodeDetected: boolean,
  isAvailableFn: (idbPath: string) => Promise<boolean> = isAvailable,
): Promise<IOSBridge> {
  // prefer idb
  if (await isAvailableFn(idbPath)) {
    return {
      idbAvailable: true,
      startLogListener: idbStartLogListener.bind(null, idbPath),
    };
  }

  // no idb, if it's a simulator and xcode is available, we can use xcrun
  if (isXcodeDetected) {
    return {
      idbAvailable: false,
      startLogListener: xcrunStartLogListener,
    };
  }
  // no idb, and not a simulator, we can't log this device
  return {
    idbAvailable: false,
  };
}
