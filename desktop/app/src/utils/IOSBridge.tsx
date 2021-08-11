/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import child_process from 'child_process';
import {DeviceType} from 'flipper-plugin-lib';
import {v1 as uuid} from 'uuid';
import path from 'path';
import {exec} from 'promisify-child-process';
import {getAppTempPath} from '../utils/pathUtils';

export interface IOSBridge {
  idbAvailable: boolean;
  startLogListener?: (
    udid: string,
    deviceType: DeviceType,
  ) => child_process.ChildProcessWithoutNullStreams;
  screenshot?: (serial: string) => Promise<Buffer>;
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
      // idb has a --json option, but that doesn't actually work for physical
      // devices!
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

function makeTempScreenshotFilePath() {
  const imageName = uuid() + '.png';
  const directory = getAppTempPath();
  return path.join(directory, imageName);
}

function runScreenshotCommand(
  command: string,
  imagePath: string,
): Promise<Buffer> {
  return exec(command)
    .then(() => fs.readFile(imagePath))
    .then(async (buffer) => {
      await fs.unlink(imagePath);
      return buffer;
    });
}

export async function xcrunScreenshot(serial: string): Promise<Buffer> {
  const imagePath = makeTempScreenshotFilePath();
  const command = `xcrun simctl io ${serial} screenshot ${imagePath}`;
  return runScreenshotCommand(command, imagePath);
}

export async function idbScreenshot(serial: string): Promise<Buffer> {
  const imagePath = makeTempScreenshotFilePath();
  const command = `idb screenshot --udid ${serial} ${imagePath}`;
  return runScreenshotCommand(command, imagePath);
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
      screenshot: idbScreenshot,
    };
  }

  // no idb, if it's a simulator and xcode is available, we can use xcrun
  if (isXcodeDetected) {
    return {
      idbAvailable: false,
      startLogListener: xcrunStartLogListener,
      screenshot: xcrunScreenshot,
    };
  }
  // no idb, and not a simulator, we can't log this device
  return {
    idbAvailable: false,
  };
}
