/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createStore} from 'redux';

import {
  selectPlugin,
  starPlugin,
  selectDevice,
  selectClient,
} from '../reducers/connections';
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
    createDevice(serial: string): BaseDevice;
    createClient(device: BaseDevice, name: string): Client;
  }) => Promise<void>,
) {
  const store = createStore(reducers);
  const logger = createStubLogger();
  store.dispatch(registerPlugins([pluginClazz]));

  function createDevice(serial: string): BaseDevice {
    const device = new BaseDevice(
      serial,
      'physical',
      'MockAndroidDevice',
      'Android',
    );
    store.dispatch({
      type: 'REGISTER_DEVICE',
      payload: device,
    });
    return device;
  }

  function createClient(device: BaseDevice, name: string): Client {
    const query: ClientQuery = {
      app: name,
      os: 'Android',
      device: device.title,
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
      [pluginClazz.id],
      device,
    );

    // yikes
    client.device = {
      then() {
        return device;
      },
    } as any;

    // As convenience, by default we select the new client, star the plugin, and select it
    store.dispatch({
      type: 'NEW_CLIENT',
      payload: client,
    });
    return client;
  }

  const device = createDevice('serial');
  const client = createClient(device, 'TestApp');

  store.dispatch(selectDevice(device));
  store.dispatch(selectClient(client.id));

  store.dispatch(
    starPlugin({
      selectedPlugin: pluginClazz.id,
      selectedApp: client.query.app,
    }),
  );

  store.dispatch(
    selectPlugin({
      selectedPlugin: pluginClazz.id,
      selectedApp: client.query.app,
      deepLinkPayload: null,
      selectedDevice: device,
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
    createDevice,
    createClient,
  });
}
