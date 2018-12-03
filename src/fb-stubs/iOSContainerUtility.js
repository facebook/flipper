/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const errorMessage = 'Physical iOS devices not yet supported';

export type DeviceTarget = {
  udid: string,
  type: 'physical' | 'emulator',
  name: string,
};

function isAvailable(): boolean {
  return false;
}

function targets(): Promise<Array<DeviceTarget>> {
  return Promise.reject(errorMessage);
}

function push(
  udid: string,
  src: string,
  bundleId: string,
  dst: string,
): Promise<void> {
  return Promise.reject(errorMessage);
}

function pull(
  udid: string,
  src: string,
  bundleId: string,
  dst: string,
): Promise<void> {
  return Promise.reject(errorMessage);
}

export default {
  isAvailable: isAvailable,
  targets: targets,
  push: push,
  pull: pull,
};
