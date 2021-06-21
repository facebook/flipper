/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Provider} from 'react-redux';
import {
  render,
  RenderResult,
  act as testingLibAct,
} from '@testing-library/react';
import {queries} from '@testing-library/dom';

import {
  selectPlugin,
  selectDevice,
  selectClient,
} from '../reducers/connections';
import BaseDevice from '../devices/BaseDevice';

import {Store} from '../reducers/index';
import Client, {ClientQuery} from '../Client';

import {Logger} from '../fb-interfaces/Logger';
import {FlipperDevicePlugin, PluginDefinition} from '../plugin';
import PluginContainer from '../PluginContainer';
import {getPluginKey, isDevicePluginDefinition} from '../utils/pluginUtils';
import MockFlipper from './MockFlipper';
import {switchPlugin} from '../reducers/pluginManager';
import {createSandyPluginFromClassicPlugin} from '../dispatcher/plugins';
import {createMockActivatablePluginDetails} from '../utils/testUtils';
import {_SandyPluginDefinition} from 'flipper-plugin';

export type MockFlipperResult = {
  client: Client;
  device: BaseDevice;
  store: Store;
  pluginKey: string;
  sendError(error: any, client?: Client): void;
  sendMessage(method: string, params: any, client?: Client): void;
  createDevice(serial: string): BaseDevice;
  createClient(
    device: BaseDevice,
    name: string,
    query?: ClientQuery,
    skipRegister?: boolean,
  ): Promise<Client>;
  logger: Logger;
  togglePlugin(plugin?: string): void;
  selectPlugin(
    id?: string,
    client?: Client,
    device?: BaseDevice,
    deepLinkPayload?: any,
  ): void;
};

type MockOptions = Partial<{
  /**
   * can be used to intercept outgoing calls. If it returns undefined
   * the base implementation will be used
   */
  onSend?: (pluginId: string, method: string, params?: object) => any;
  additionalPlugins?: PluginDefinition[];
  dontEnableAdditionalPlugins?: true;
  asBackgroundPlugin?: true;
  supportedPlugins?: string[];
  device?: BaseDevice;
  archivedDevice?: boolean;
  disableLegacyWrapper?: boolean;
}>;

function isPluginEnabled(
  store: Store,
  pluginClazz: PluginDefinition,
  selectedApp: string,
) {
  return (
    (!isDevicePluginDefinition(pluginClazz) &&
      store
        .getState()
        .connections.enabledPlugins[selectedApp]?.includes(pluginClazz.id)) ||
    (isDevicePluginDefinition(pluginClazz) &&
      store.getState().connections.enabledDevicePlugins.has(pluginClazz.id))
  );
}

export async function createMockFlipperWithPlugin(
  pluginClazz: PluginDefinition,
  options?: MockOptions,
): Promise<MockFlipperResult> {
  function wrapSandy(clazz: PluginDefinition) {
    return clazz instanceof _SandyPluginDefinition ||
      options?.disableLegacyWrapper
      ? clazz
      : createSandyPluginFromClassicPlugin(
          createMockActivatablePluginDetails({
            id: clazz.id,
            title: clazz.title ?? clazz.id,
            pluginType:
              clazz.prototype instanceof FlipperDevicePlugin
                ? 'device'
                : 'client',
          }),
          clazz,
        );
  }

  pluginClazz = wrapSandy(pluginClazz);
  const mockFlipper = new MockFlipper();
  await mockFlipper.init({
    plugins: [
      pluginClazz,
      ...(options?.additionalPlugins?.map(wrapSandy) ?? []),
    ],
  });
  const logger = mockFlipper.logger;
  const store = mockFlipper.store;

  const createDevice = (serial: string, archived?: boolean) =>
    mockFlipper.createDevice({serial, archived});
  const createClient = async (
    device: BaseDevice,
    name: string,
    query?: ClientQuery,
    skipRegister?: boolean,
  ) => {
    const client = await mockFlipper.createClient(device, {
      name,
      query,
      skipRegister,
      onSend: options?.onSend,
      supportedPlugins: options?.supportedPlugins,
      backgroundPlugins: options?.asBackgroundPlugin ? [pluginClazz.id] : [],
    });

    // enable the plugin
    if (!isPluginEnabled(store, pluginClazz, name)) {
      store.dispatch(
        switchPlugin({
          plugin: pluginClazz,
          selectedApp: client.query.app,
        }),
      );
    }

    if (!options?.dontEnableAdditionalPlugins) {
      options?.additionalPlugins?.forEach((plugin) => {
        if (!isPluginEnabled(store, plugin, name)) {
          store.dispatch(
            switchPlugin({
              plugin,
              selectedApp: client.query.app,
            }),
          );
        }
      });
    }
    return client;
  };

  const device = options?.device
    ? mockFlipper.loadDevice(options?.device)
    : createDevice('serial', options?.archivedDevice);
  const client = await createClient(device, 'TestApp');

  store.dispatch(selectDevice(device));
  store.dispatch(selectClient(client.id));

  let lastSelected: string | undefined = undefined;

  function selectPluginImpl(
    id = pluginClazz.id,
    theClient = client,
    theDevice = device,
    deepLinkPayload = null,
  ) {
    if (lastSelected) {
      client.deinitPlugin(lastSelected);
    }
    store.dispatch(
      selectPlugin({
        selectedPlugin: id,
        selectedApp: theClient.query.app,
        deepLinkPayload,
        selectedDevice: theDevice,
      }),
    );
    client.initPlugin(pluginClazz.id); // simulates plugin being mounted
    lastSelected = pluginClazz.id;
  }

  selectPluginImpl();

  return {
    client,
    device: device as any,
    store,
    selectPlugin: selectPluginImpl,
    sendError(error: any, actualClient = client) {
      actualClient.onMessage(
        JSON.stringify({
          error,
        }),
      );
    },
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
    togglePlugin(id?: string) {
      const plugin = id
        ? store.getState().plugins.clientPlugins.get(id) ??
          store.getState().plugins.devicePlugins.get(id)
        : pluginClazz;
      if (!plugin) {
        throw new Error('unknown plugin ' + id);
      }
      store.dispatch(
        switchPlugin({
          plugin,
          selectedApp: client.query.app,
        }),
      );
    },
  };
}

type Renderer = RenderResult<typeof queries>;

export async function renderMockFlipperWithPlugin(
  pluginClazz: PluginDefinition,
  options?: MockOptions,
): Promise<
  MockFlipperResult & {
    renderer: Renderer;
    act: (cb: () => void) => void;
  }
> {
  const args = await createMockFlipperWithPlugin(pluginClazz, options);

  function selectTestPlugin(store: Store, client: Client) {
    store.dispatch(
      selectPlugin(
        isDevicePluginDefinition(pluginClazz)
          ? {
              selectedPlugin: pluginClazz.id,
              selectedApp: null,
              deepLinkPayload: null,
              selectedDevice: store.getState().connections.selectedDevice!,
            }
          : {
              selectedPlugin: pluginClazz.id,
              selectedApp: client.query.app,
              deepLinkPayload: null,
              selectedDevice: store.getState().connections.selectedDevice!,
            },
      ),
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
