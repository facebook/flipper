/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceType} from '../devices/BaseDevice';
import {exec} from 'promisify-child-process';
import {notNull} from '../utils/typeUtils';
import {killOrphanedInstrumentsProcesses} from '../utils/processCleanup';

const errorMessage = 'Physical iOS devices not yet supported';

export type DeviceTarget = {
  udid: string;
  type: DeviceType;
  name: string;
};

function isAvailable(): boolean {
  return false;
}

async function targets(): Promise<Array<DeviceTarget>> {
  await killOrphanedInstrumentsProcesses();
  const {stdout} = await exec('instruments -s devices');
  if (!stdout) {
    return [];
  }
  return stdout
    .toString()
    .split('\n')
    .map((line) => line.trim())
    .map((line) => /(.+) \([^(]+\) \[(.*)\]( \(Simulator\))?/.exec(line))
    .filter(notNull)
    .filter(
      ([_match, name, _udid, isSim]) =>
        !isSim && (name.includes('iPhone') || name.includes('iPad')),
    )
    .map(([_match, name, udid]) => {
      return {udid: udid, type: 'physical', name: name};
    });
}

function push(
  _udid: string,
  _src: string,
  _bundleId: string,
  _dst: string,
): Promise<void> {
  return Promise.reject(errorMessage);
}

function pull(
  _udid: string,
  _src: string,
  _bundleId: string,
  _dst: string,
): Promise<void> {
  return Promise.reject(errorMessage);
}

export default {
  isAvailable: isAvailable,
  targets: targets,
  push: push,
  pull: pull,
};
