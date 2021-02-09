/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import path from 'path';
import BaseDevice from '../devices/BaseDevice';
import {reportPlatformFailures} from './metrics';
import expandTilde from 'expand-tilde';
import {remote} from 'electron';
import config from '../utils/processConfig';

// TODO: refactor so this doesn't need to be exported
export const CAPTURE_LOCATION = expandTilde(
  config().screenCapturePath || remote.app.getPath('desktop'),
);

// TODO: refactor so this doesn't need to be exported
export function getFileName(extension: 'png' | 'mp4'): string {
  // Windows does not like `:` in its filenames. Yes, I know ...
  return `screencap-${new Date().toISOString().replace(/:/g, '')}.${extension}`;
}

export async function capture(device: BaseDevice): Promise<string> {
  if (device.isArchived) {
    console.log('Skipping screenshot for archived device');
    return '';
  }
  const pngPath = path.join(CAPTURE_LOCATION, getFileName('png'));
  return reportPlatformFailures(
    device.screenshot().then((buffer) => writeBufferToFile(pngPath, buffer)),
    'captureScreenshot',
  );
}

/**
 * Writes a buffer to a specified file path.
 * Returns a Promise which resolves to the file path.
 */
export const writeBufferToFile = (
  filePath: string,
  buffer: Buffer,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(filePath);
      }
    });
  });
};

/**
 * Creates a Blob from a Buffer
 */
export const bufferToBlob = (buffer: Buffer): Blob => {
  return new Blob([buffer]);
};
