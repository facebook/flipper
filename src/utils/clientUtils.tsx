/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Client from '../Client';
import BaseDevice from '../devices/BaseDevice';

export type ClientIdConstituents = {
  app: string;
  os: string;
  device: string;
  device_id: string;
};

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
    .map(client => client.appName);
  return currentActiveApps;
}

export function buildClientId(clientInfo: {
  app: string;
  os: string;
  device: string;
  device_id: string;
}): string {
  for (const key of ['app', 'os', 'device', 'device_id'] as Array<
    keyof ClientIdConstituents
  >) {
    if (!clientInfo[key]) {
      console.error(
        `Attempted to build clientId with invalid ${key}: "${clientInfo[key]}`,
      );
    }
  }
  return `${clientInfo.app}#${clientInfo.os}#${clientInfo.device}#${clientInfo.device_id}`;
}

export function deconstructClientId(clientId: string): ClientIdConstituents {
  if (!clientId || clientId.split('#').length !== 4) {
    console.error(`Attempted to deconstruct invalid clientId: "${clientId}"`);
  }
  const [app, os, device, device_id] = clientId.split('#');
  return {
    app,
    os,
    device,
    device_id,
  };
}
