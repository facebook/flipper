/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
} from '../../reducers/connections';
import BaseDevice from '../../devices/BaseDevice';

import {Store} from '../../reducers/index';
import Client from '../../Client';

import {ClientQuery, FlipperServer, Logger} from 'flipper-common';
import {
  FlipperDevicePlugin,
  FlipperPlugin,
  PluginDefinition,
} from '../../plugin';
import PluginContainer from '../../PluginContainer';
import {isDevicePluginDefinition} from '../../utils/pluginUtils';
import {getPluginKey} from '../../utils/pluginKey';

import MockFlipper from './MockFlipper';
import {switchPlugin} from '../../reducers/pluginManager';
import {createSandyPluginFromClassicPlugin} from '../../dispatcher/plugins';
import {createMockActivatablePluginDetails} from '../../utils/testUtils';
import {_SandyPluginDefinition} from 'flipper-plugin';
import {awaitPluginCommandQueueEmpty} from '../../dispatcher/pluginManager';

export type MockFlipperResult = {
  client: Client;
  device: BaseDevice;
  store: Store;
  server: FlipperServer;
  pluginKey: string;
  sendError(error: any, client?: Client): void;
  sendMessage(method: string, params: any, client?: Client): void;
  createDevice(options: Parameters<MockFlipper['createDevice']>[0]): BaseDevice;
  createClient(
    device: BaseDevice,
    name: string,
    query?: ClientQuery,
    skipRegister?: boolean,
  ): Promise<Client>;
  logger: Logger;
  togglePlugin(plugin?: string): Promise<void>;
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
  additionalPlugins?: (PluginDefinition | LegacyPluginDefinition)[];
  dontEnableAdditionalPlugins?: true;
  asBackgroundPlugin?: true;
  supportedPlugins?: string[];
  device?: BaseDevice;
  archivedDevice?: boolean;
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

export type LegacyPluginDefinition =
  | typeof FlipperDevicePlugin
  | typeof FlipperPlugin;

export function wrapSandy(
  clazz: PluginDefinition | LegacyPluginDefinition,
): PluginDefinition {
  return clazz instanceof _SandyPluginDefinition
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

export async function createMockFlipperWithPlugin(
  pluginClazzOrig: PluginDefinition | LegacyPluginDefinition,
  options?: MockOptions,
): Promise<MockFlipperResult> {
  const pluginClazz = wrapSandy(pluginClazzOrig);
  const additionalPlugins = options?.additionalPlugins?.map(wrapSandy) ?? [];

  const mockFlipper = new MockFlipper();
  await mockFlipper.init({
    plugins: [pluginClazz, ...additionalPlugins],
  });
  const logger = mockFlipper.logger;
  const store = mockFlipper.store;
  const server = mockFlipper.flipperServer;

  const createDevice = (options: Parameters<MockFlipper['createDevice']>[0]) =>
    mockFlipper.createDevice(options);
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
      additionalPlugins.forEach((plugin) => {
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
    await awaitPluginCommandQueueEmpty(store);
    return client;
  };

  const device = options?.device
    ? mockFlipper.loadDevice(options?.device)
    : createDevice({serial: 'serial', archived: options?.archivedDevice});
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
        selectedAppId: theClient.id,
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
    server,
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
    async togglePlugin(id?: string) {
      const plugin = id
        ? store.getState().plugins.clientPlugins.get(id) ??
          store.getState().plugins.devicePlugins.get(id)
        : pluginClazz;
      if (!plugin) {
        throw new Error(`unknown plugin ${id}`);
      }
      store.dispatch(
        switchPlugin({
          plugin,
          selectedApp: client.query.app,
        }),
      );
      await awaitPluginCommandQueueEmpty(store);
    },
  };
}

type Renderer = RenderResult<typeof queries>;

export async function renderMockFlipperWithPlugin(
  pluginClazzOrig: PluginDefinition | LegacyPluginDefinition,
  options?: MockOptions,
): Promise<
  MockFlipperResult & {
    renderer: Renderer;
    act: (cb: () => void) => void;
  }
> {
  const pluginClazz = wrapSandy(pluginClazzOrig);
  const args = await createMockFlipperWithPlugin(pluginClazz, options);

  function selectTestPlugin(store: Store, client: Client) {
    store.dispatch(
      selectPlugin(
        isDevicePluginDefinition(pluginClazz)
          ? {
              selectedPlugin: pluginClazz.id,
              selectedAppId: null,
              deepLinkPayload: null,
              selectedDevice: store.getState().connections.selectedDevice!,
            }
          : {
              selectedPlugin: pluginClazz.id,
              selectedAppId: client.id,
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
