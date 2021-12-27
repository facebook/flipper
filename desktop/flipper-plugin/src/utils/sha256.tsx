/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {isTest} from 'flipper-common';

export function sha256(message: string): Promise<string> {
  if (isTest()) {
    return Promise.resolve(message.substr(0, 100));
  }
  // From https://stackoverflow.com/a/48161723/1983583
  const msgBuffer = new TextEncoder().encode(message);
  return crypto.subtle.digest('SHA-256', msgBuffer).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  });
}
