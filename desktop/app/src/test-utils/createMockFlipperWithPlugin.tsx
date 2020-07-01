/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {createStore} from 'redux';
import {Provider} from 'react-redux';
import {
  render,
  RenderResult,
  act as testingLibAct,
} from '@testing-library/react';

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
import {PluginDefinition} from '../plugin';
import {registerPlugins} from '../reducers/plugins';
import PluginContainer from '../PluginContainer';
import {getPluginKey} from '../utils/pluginUtils';
import {getInstance} from '../fb-stubs/Logger';

type MockFlipperResult = {
  client: Client;
  device: BaseDevice;
  store: Store;
  pluginKey: string;
  sendMessage(method: string, params: any, client?: Client): void;
  createDevice(serial: string): BaseDevice;
  createClient(device: BaseDevice, name: string): Promise<Client>;
  logger: Logger;
};

type MockOptions = Partial<{
  /**
   * can be used to intercept outgoing calls. If it returns undefined
   * the base implementation will be used
   */
  onSend(pluginId: string, method: string, params?: object): any;
}>;

export async function createMockFlipperWithPlugin(
  pluginClazz: PluginDefinition,
  options?: MockOptions,
): Promise<MockFlipperResult> {
  const store = createStore(reducers);
  const logger = getInstance();
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

  async function createClient(
    device: BaseDevice,
    name: string,
  ): Promise<Client> {
    const query: ClientQuery = {
      app: name,
      os: 'Android',
      device: device.title,
      device_id: device.serial,
      sdk_version: 4,
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
    client.rawCall = async (
      method: string,
      _fromPlugin: boolean,
      params: any,
    ): Promise<any> => {
      const intercepted = options?.onSend?.(method, params);
      if (intercepted !== undefined) {
        return intercepted;
      }
      switch (method) {
        case 'getPlugins':
          // assuming this plugin supports all plugins for now
          return {
            plugins: [
              ...store.getState().plugins.clientPlugins.keys(),
              ...store.getState().plugins.devicePlugins.keys(),
            ],
          };
        case 'getBackgroundPlugins':
          return {plugins: []};
        default:
          throw new Error(
            `Test client doesn't support rawCall method '${method}'`,
          );
      }
    };

    // enable the plugin
    if (
      !store
        .getState()
        .connections.userStarredPlugins[client.query.app]?.includes(
          pluginClazz.id,
        )
    ) {
      store.dispatch(
        starPlugin({
          plugin: pluginClazz,
          selectedApp: client.query.app,
        }),
      );
    }
    await client.init();

    // As convenience, by default we select the new client, star the plugin, and select it
    store.dispatch({
      type: 'NEW_CLIENT',
      payload: client,
    });
    return client;
  }

  const device = createDevice('serial');
  const client = await createClient(device, 'TestApp');

  store.dispatch(selectDevice(device));
  store.dispatch(selectClient(client.id));

  store.dispatch(
    selectPlugin({
      selectedPlugin: pluginClazz.id,
      selectedApp: client.query.app,
      deepLinkPayload: null,
      selectedDevice: device,
    }),
  );

  return {
    client,
    device: device as any,
    store,
    sendMessage(method, params, actualClient = client) {
      actualClient.onMessage(
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
    logger,
    pluginKey: getPluginKey(client.id, device, pluginClazz.id),
  };
}

type Renderer = RenderResult<typeof import('testing-library__dom/queries')>;

export async function renderMockFlipperWithPlugin(
  pluginClazz: PluginDefinition,
): Promise<
  MockFlipperResult & {
    renderer: Renderer;
    act: (cb: () => void) => void;
  }
> {
  const args = await createMockFlipperWithPlugin(pluginClazz);

  function selectTestPlugin(store: Store, client: Client) {
    store.dispatch(
      selectPlugin({
        selectedPlugin: pluginClazz.id,
        selectedApp: client.query.app,
        deepLinkPayload: null,
        selectedDevice: store.getState().connections.selectedDevice!,
      }),
    );
  }

  selectTestPlugin(args.store, args.client);

  const renderer = render(
    <Provider store={args.store}>
      <PluginContainer logger={args.logger} />
    </Provider>,
  );

  return {
    ...args,
    renderer: renderer as any,
    act(cb) {
      testingLibAct(cb);
      args.client.flushMessageBuffer();
    },
  };
}
