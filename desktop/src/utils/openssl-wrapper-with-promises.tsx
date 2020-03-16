/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {exec as opensslWithCallback, Action} from 'openssl-wrapper';
import child_process from 'child_process';

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

export function isInstalled(): boolean {
  return !child_process.spawnSync('openssl', ['version']).error;
}
