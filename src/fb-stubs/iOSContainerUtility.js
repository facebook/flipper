/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {promisify} from 'util';
import type {DeviceType} from '../devices/BaseDevice';
const exec = promisify(require('child_process').exec);

const errorMessage = 'Physical iOS devices not yet supported';

export type DeviceTarget = {
  udid: string,
  type: DeviceType,
  name: string,
};

function isAvailable(): boolean {
  return false;
}

function targets(): Promise<Array<DeviceTarget>> {
  return exec('instruments -s devices').then(({stdout}) =>
    stdout
      .toString()
      .split('\n')
      .map(line => line.trim())
      .map(line => /(.+) \([^(]+\) \[(.*)\]( \(Simulator\))?/.exec(line))
      .filter(Boolean)
      .filter(
        ([match, name, udid, isSim]) =>
          !isSim && (name.includes('iPhone') || name.includes('iPad')),
      )
      .map(([match, name, udid]) => {
        return {udid: udid, type: 'physical', name: name};
      }),
  );
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
