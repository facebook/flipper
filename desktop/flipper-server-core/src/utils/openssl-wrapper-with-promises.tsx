/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {exec as opensslWithCallback, Action} from 'openssl-wrapper';
import {spawn} from 'promisify-child-process';

export function openssl(action: Action, options: {}): Promise<string> {
  return new Promise((resolve, reject) => {
    opensslWithCallback(action, options, (err, buffer) => {
      if (err) {
        reject(err);
      } else if (buffer) {
        resolve(buffer.toString());
      }
    });
  });
}

export async function isInstalled(): Promise<boolean> {
  try {
    const result = await spawn('openssl', ['version']);
    return result.code === 0;
  } catch (_e) {
    return false;
  }
}
