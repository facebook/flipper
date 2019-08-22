/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import fs from 'fs';

/**
 * Writes a buffer to a specified file path.
 * Returns a Promise which resolves to the file path.
 */
export const writeBufferToFile = (filePath: string, buffer: Buffer) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, buffer, err => {
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
