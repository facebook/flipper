/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {deconstructClientId} from 'flipper-common';
import type Client from '../Client';
import type {BaseDevice} from 'flipper-frontend-core';

export function currentActiveApps(
  clients: Array<Client>,
  selectedDevice: null | BaseDevice,
): Array<string> {
  const currentActiveApps: Array<string> = clients
    .map(({id}: {id: string}) => {
      const appName = deconstructClientId(id).app || '';
      const os = deconstructClientId(id).os || '';
      return {appName, os};
    })
    .filter(
      ({os}: {os: string}) => os && selectedDevice && os == selectedDevice.os,
    )
    .map((client) => client.appName);
  return currentActiveApps;
}
