/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {selectPlugin} from '../reducers/connections';
import {Store} from '../reducers/index';

type OpenPluginParams = {
  pluginId: string;
  client: string | undefined;
  devices: string[];
  payload: string | undefined;
};

export function parseOpenPluginParams(query: string): OpenPluginParams {
  // 'flipper://open-plugin?plugin-id=graphql&client=facebook&devices=android,ios&chrome=1&payload='
  const url = new URL(query);
  const params = new Map<string, string>(url.searchParams as any);
  if (!params.has('plugin-id')) {
    throw new Error('Missing plugin-id param');
  }
  return {
    pluginId: params.get('plugin-id')!,
    client: params.get('client'),
    devices: params.get('devices')?.split(',') ?? [],
    payload: params.get('payload')
      ? decodeURIComponent(params.get('payload')!)
      : undefined,
  };
}

export async function handleOpenPluginDeeplink(store: Store, query: string) {
  const params = parseOpenPluginParams(query);
  await verifyLighthouse();
  await verifyUserIsLoggedIn();
  await verifyFlipperIsUpToDate();
  await verifyPluginInstalled();
  await verifyClient();
  await verifyPluginInstalled();
  await openPlugin(store, params);
}
function verifyLighthouse() {
  // TODO:
}

function verifyUserIsLoggedIn() {
  // TODO:
}

function verifyFlipperIsUpToDate() {
  // TODO:
}

function verifyPluginInstalled() {
  // TODO:
}

function verifyClient() {
  // TODO:
}

function openPlugin(store: Store, params: OpenPluginParams) {
  store.dispatch(
    selectPlugin({
      selectedApp: params.client,
      selectedPlugin: params.pluginId,
      deepLinkPayload: params.payload,
    }),
  );
}
