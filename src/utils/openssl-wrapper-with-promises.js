/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {exec as opensslWithCallback} from 'openssl-wrapper';

export function openssl(action: string, options: {}): Promise<string> {
  return new Promise((resolve, reject) => {
    opensslWithCallback(action, options, (err, buffer) => {
      if (err) {
        reject(err);
      }
      resolve(buffer.toString());
    });
  });
}
