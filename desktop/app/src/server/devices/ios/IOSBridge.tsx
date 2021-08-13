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
import {getAppTempPath} from '../../../utils/pathUtils';

export const ERR_NO_IDB_OR_XCODE_AVAILABLE =
  'Neither Xcode nor idb available. Cannot provide iOS device functionality.';

export const ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB =
  'Cannot provide logs from a physical device without idb.';

export interface IOSBridge {
  startLogListener: (
    udid: string,
    deviceType: DeviceType,
  ) => child_process.ChildProcessWithoutNullStreams;
  screenshot: (serial: string) => Promise<Buffer>;
  navigate: (serial: string, location: string) => Promise<void>;
  recordVideo: (
    serial: string,
    outputFile: string,
  ) => child_process.ChildProcess;
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
  if (deviceType === 'physical') {
    throw new Error(ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB);
  }
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

async function runScreenshotCommand(
  command: string,
  imagePath: string,
): Promise<Buffer> {
  await exec(command);
  const buffer = await fs.readFile(imagePath);
  await fs.unlink(imagePath);
  return buffer;
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

export async function xcrunNavigate(
  serial: string,
  location: string,
): Promise<void> {
  exec(`xcrun simctl io ${serial} launch url "${location}"`);
}

export async function idbNavigate(
  serial: string,
  location: string,
): Promise<void> {
  exec(`idb open --udid ${serial} "${location}"`);
}

export function xcrunRecordVideo(
  serial: string,
  outputFile: string,
): child_process.ChildProcess {
  console.log(`Starting screen record via xcrun to ${outputFile}.`);
  return exec(
    `xcrun simctl io ${serial} recordVideo --codec=h264 --force ${outputFile}`,
  );
}

export function idbRecordVideo(
  serial: string,
  outputFile: string,
): child_process.ChildProcess {
  console.log(`Starting screen record via idb to ${outputFile}.`);
  return exec(`idb record-video --udid ${serial} ${outputFile}`);
}

export async function makeIOSBridge(
  idbPath: string,
  isXcodeDetected: boolean,
  isAvailableFn: (idbPath: string) => Promise<boolean> = isAvailable,
): Promise<IOSBridge> {
  // prefer idb
  if (await isAvailableFn(idbPath)) {
    return {
      startLogListener: idbStartLogListener.bind(null, idbPath),
      screenshot: idbScreenshot,
      navigate: idbNavigate,
      recordVideo: idbRecordVideo,
    };
  }

  // no idb, if it's a simulator and xcode is available, we can use xcrun
  if (isXcodeDetected) {
    return {
      startLogListener: xcrunStartLogListener,
      screenshot: xcrunScreenshot,
      navigate: xcrunNavigate,
      recordVideo: xcrunRecordVideo,
    };
  }

  throw new Error(ERR_NO_IDB_OR_XCODE_AVAILABLE);
}
