/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {IncomingHttpHeaders} from 'http';

export function getRequestAuthToken(
  headers: IncomingHttpHeaders,
): string | null {
  const cookie = headers.cookie?.match(/(?:^|;\s*)flipper_auth=([^;]*)/);
  if (cookie?.[1]) {
    return cookie[1];
  }

  const accessToken = headers['x-access-token'];
  return typeof accessToken === 'string' ? accessToken : null;
}
