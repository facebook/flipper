/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import Client from '../Client';
import BaseDevice from '../devices/BaseDevice';

export function currentActiveApps(
  clients: Array<Client>,
  selectedDevice: null | BaseDevice,
): Array<string> {
  const currentActiveApps: Array<string> = clients
    .map(({id}: {id: string}) => {
      const appName = appNameFromClienID(id) || '';
      const device = deviceFromClienID(id) || '';
      return {appName, device};
    })
    .filter(
      ({device}: {device: string}) =>
        device && selectedDevice && device == selectedDevice.os,
    )
    .map(client => client.appName);
  return currentActiveApps;
}

export function appNameFromClienID(id: string): string | undefined {
  const arr = id.split('#');
  const appName = arr[0];
  return appName;
}

export function deviceFromClienID(id: string): string | undefined {
  const arr = id.split('#');
  const device = arr[1];
  return device;
}
