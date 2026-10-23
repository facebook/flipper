/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function isLoopbackAddress(address: string | undefined): boolean {
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1'
  );
}

export function isAllowedHost(host: string | undefined): boolean {
  return (
    host !== undefined &&
    ALLOWED_HOSTS.some(
      (allowedHost) =>
        host === allowedHost || host.startsWith(`${allowedHost}:`),
    )
  );
}
