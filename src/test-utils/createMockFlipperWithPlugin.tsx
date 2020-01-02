/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createStore} from 'redux';

import {selectPlugin} from '../reducers/connections';
import BaseDevice from '../devices/BaseDevice';

import reducers, {Store} from '../reducers/index';
import Client, {ClientQuery} from '../Client';

import {buildClientId} from '../utils/clientUtils';
import {Logger} from '../fb-interfaces/Logger';
import {FlipperPlugin} from '../plugin';
import {registerPlugins} from '../reducers/plugins';

export function createStubLogger(): Logger {
  return {
    ...console,
    track: console.info,
    trackTimeSince: console.info,
  };
}

export async function createMockFlipperWithPlugin(
  pluginClazz: typeof FlipperPlugin,
  callback: (args: {
    client: Client;
    device: BaseDevice;
    store: Store;
    sendMessage(method: string, params: any): void;
  }) => Promise<void>,
) {
  const store = createStore(reducers);
  const device = new BaseDevice('serial', 'physical', 'title', 'Android');
  const logger = createStubLogger();

  store.dispatch(registerPlugins([pluginClazz]));

  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: device,
  });

  const query: ClientQuery = {
    app: 'TestApp',
    os: 'Android',
    device: 'unit_test',
    device_id: device.serial,
  };
  const id = buildClientId({
    app: query.app,
    os: query.os,
    device: query.device,
    device_id: query.device_id,
  });

  const client = new Client(
    id,
    query,
    null, // create a stub connection to avoid this plugin to be archived?
    logger,
    store,
    [pluginClazz.name],
    device,
  );

  // yikes
  client._deviceSet = device;
  client.device = {
    then() {
      return device;
    },
  } as any;

  store.dispatch({
    type: 'NEW_CLIENT',
    payload: client,
  });

  store.dispatch(
    selectPlugin({
      selectedPlugin: pluginClazz.name,
      selectedApp: client.query.app,
      deepLinkPayload: null,
    }),
  );

  await callback({
    client,
    device: device as any,
    store,
    sendMessage(method, params) {
      client.onMessage(
        JSON.stringify({
          method: 'execute',
          params: {
            api: pluginClazz.id,
            method,
            params,
          },
        }),
      );
    },
  });
}
