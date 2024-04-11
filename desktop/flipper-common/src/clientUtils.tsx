/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientQuery, UninitializedClient} from './server-types';

/* A Client uniuely identifies an app running on some device.

  Always use this utility to construct and parse clientId strings.
 */
export type ClientIdConstituents = {
  app: string;
  os: string;
  device: string;
  device_id: string;
};

/* A plugin key is a string uniquely identifying an instance of a plugin.
   This can be a device plugin for a particular device, or a client plugin for a particular client (app).
   In the device plugin case, the "client" is the device it's connected to.
   In the client plugin case (normal plugins), the "client" is the app it's connected to.

   Always use this utility to construct and parse pluginKey strings.
 */
type PluginKeyConstituents =
  | {
      type: 'device';
      pluginName: string;
      client: string;
    }
  | ({
      type: 'client';
      pluginName: string;
      client: string;
    } & ClientIdConstituents);

export function buildClientId(clientInfo: {
  app: string;
  os: string;
  device: string;
  device_id: string;
}): string {
  const escapedName = escape(clientInfo.app);
  const result = `${escapedName}#${clientInfo.os}#${clientInfo.device}#${clientInfo.device_id}`;
  // N.B.: device_id can be empty, which designates the host device
  for (const key of ['app', 'os', 'device'] as Array<
    keyof ClientIdConstituents
  >) {
    if (!clientInfo[key]) {
      console.error(
        `Attempted to build clientId with invalid ${key}: "${clientInfo[key]} (identifier: ${result})`,
      );
    }
  }
  return result;
}

export function buildGenericClientId(client: UninitializedClient): string {
  const escapedName = escape(client.appName);
  return `${client.os}:${client.deviceName}:${escapedName}`.toLowerCase();
}

export function buildGenericClientIdFromQuery(
  clientQuery: ClientQuery,
): string {
  const escapedName = escape(clientQuery.app);
  return `${clientQuery.os}:${clientQuery.device}:${escapedName}`.toLowerCase();
}

export function deconstructClientId(clientId: string): ClientIdConstituents {
  if (!clientId || clientId.split('#').length !== 4) {
    console.error(`Attempted to deconstruct invalid clientId: "${clientId}"`);
  }
  let [app, os, device, device_id] = clientId.split('#');
  app = unescape(app);
  return {
    app,
    os,
    device,
    device_id,
  };
}

export function deconstructPluginKey(pluginKey: string): PluginKeyConstituents {
  const parts = pluginKey.split('#');
  if (parts.length === 2) {
    // Device plugin
    return {
      type: 'device',
      client: parts[0],
      pluginName: parts[1],
    };
  } else {
    // Client plugin
    const lastHashIndex = pluginKey.lastIndexOf('#');
    const clientId = pluginKey.slice(0, lastHashIndex);
    const pluginName = pluginKey.slice(lastHashIndex + 1);
    if (!pluginName) {
      console.error(
        `Attempted to deconstruct invalid pluginKey: "${pluginKey}"`,
      );
    }
    return {
      type: 'client',
      ...deconstructClientId(clientId),
      client: clientId,
      pluginName,
    };
  }
}
