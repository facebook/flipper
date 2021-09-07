/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * A set of utilities that should be provided by the hosting environment
 */
export interface FlipperServerHost {}

let instance: FlipperServerHost | undefined;

export function getFlipperServerHost(): FlipperServerHost {
  if (!instance) {
    throw new Error(
      'FlipperServerHost not set, call setFlipperServerHost first',
    );
  }
  return instance;
}

export function setFlipperServerHost(impl: FlipperServerHost) {
  if (instance) {
    throw new Error('FlipperServerHost was already set');
  }
  instance = impl;
}
