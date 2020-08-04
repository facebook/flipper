/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {Store, Client} from '../../';
import {selectPlugin, starPlugin} from '../../reducers/connections';
import {registerPlugins} from '../../reducers/plugins';
import {
  SandyPluginDefinition,
  SandyPluginInstance,
  FlipperClient,
  TestUtils,
} from 'flipper-plugin';

interface PersistedState {
  count: 1;
}

const pluginDetails = TestUtils.createMockPluginDetails();

let initialized = false;

beforeEach(() => {
  initialized = false;
});

function plugin(client: FlipperClient<any, any>) {
  const connectStub = jest.fn();
  const disconnectStub = jest.fn();
  const destroyStub = jest.fn();

  client.onConnect(connectStub);
  client.onDisconnect(disconnectStub);
  client.onDestroy(destroyStub);

  initialized = true;

  return {
    connectStub,
    disconnectStub,
    destroyStub,
    send: client.send,
  };
}
const TestPlugin = new SandyPluginDefinition(pluginDetails, {
  plugin: jest.fn().mockImplementation(plugin) as typeof plugin,
  Component: jest.fn().mockImplementation(() => null),
});

type PluginApi = ReturnType<typeof plugin>;

function starTestPlugin(store: Store, client: Client) {
  store.dispatch(
    starPlugin({
      plugin: TestPlugin,
      selectedApp: client.query.app,
    }),
  );
}

function selectTestPlugin(store: Store, client: Client) {
  store.dispatch(
    selectPlugin({
      selectedPlugin: TestPlugin.id,
      selectedApp: client.query.app,
      deepLinkPayload: null,
      selectedDevice: store.getState().connections.selectedDevice!,
    }),
  );
}

test('it should initialize starred sandy plugins', async () => {
  const {client, store} = await createMockFlipperWithPlugin(TestPlugin);

  // already started, so initialized immediately
  expect(initialized).toBe(true);
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBeInstanceOf(
    SandyPluginInstance,
  );
  const instanceApi: PluginApi = client.sandyPluginStates.get(TestPlugin.id)!
    .instanceApi;

  expect(instanceApi.connectStub).toBeCalledTimes(0);
  selectTestPlugin(store, client);

  // without rendering, non-bg plugins won't connect automatically,
  // so this isn't the best test, but PluginContainer tests do test that part of the lifecycle
  client.initPlugin(TestPlugin.id);
  expect(instanceApi.connectStub).toBeCalledTimes(1);
  client.deinitPlugin(TestPlugin.id);
  expect(instanceApi.disconnectStub).toBeCalledTimes(1);
  expect(instanceApi.destroyStub).toBeCalledTimes(0);
});

test('it should cleanup a plugin if disabled', async () => {
  const {client, store} = await createMockFlipperWithPlugin(TestPlugin);

  expect(TestPlugin.asPluginModule().plugin).toBeCalledTimes(1);
  const pluginInstance: PluginApi = client.sandyPluginStates.get(TestPlugin.id)!
    .instanceApi;
  expect(pluginInstance.destroyStub).toHaveBeenCalledTimes(0);
  client.initPlugin(TestPlugin.id);
  expect(pluginInstance.connectStub).toHaveBeenCalledTimes(1);

  // unstar
  starTestPlugin(store, client);
  expect(client.sandyPluginStates.has(TestPlugin.id)).toBeFalsy();
  expect(pluginInstance.disconnectStub).toHaveBeenCalledTimes(1);
  expect(pluginInstance.destroyStub).toHaveBeenCalledTimes(1);
});

test('it should cleanup if client is removed', async () => {
  const {client} = await createMockFlipperWithPlugin(TestPlugin);
  const pluginInstance = client.sandyPluginStates.get(TestPlugin.id)!;
  expect(pluginInstance.instanceApi.destroyStub).toHaveBeenCalledTimes(0);

  // close client
  client.close();
  expect(client.sandyPluginStates.has(TestPlugin.id)).toBeFalsy();
  expect(
    (pluginInstance.instanceApi as PluginApi).destroyStub,
  ).toHaveBeenCalledTimes(1);
});

test('it should not initialize a sandy plugin if not enabled', async () => {
  const {client, store} = await createMockFlipperWithPlugin(TestPlugin);

  const Plugin2 = new SandyPluginDefinition(
    TestUtils.createMockPluginDetails({
      name: 'Plugin2',
      id: 'Plugin2',
    }),
    {
      plugin: jest.fn().mockImplementation(plugin),
      Component() {
        return null;
      },
    },
  );

  const pluginState1 = client.sandyPluginStates.get(TestPlugin.id);
  expect(pluginState1).toBeInstanceOf(SandyPluginInstance);
  store.dispatch(registerPlugins([Plugin2]));
  await client.refreshPlugins();
  // not yet enabled, so not yet started
  expect(client.sandyPluginStates.get(Plugin2.id)).toBeUndefined();
  expect(Plugin2.asPluginModule().plugin).toBeCalledTimes(0);

  store.dispatch(
    starPlugin({
      plugin: Plugin2,
      selectedApp: client.query.app,
    }),
  );

  expect(client.sandyPluginStates.get(Plugin2.id)).toBeInstanceOf(
    SandyPluginInstance,
  );
  const instance = client.sandyPluginStates.get(Plugin2.id)!
    .instanceApi as PluginApi;
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBe(pluginState1); // not reinitialized

  expect(TestPlugin.asPluginModule().plugin).toBeCalledTimes(1);
  expect(Plugin2.asPluginModule().plugin).toBeCalledTimes(1);
  expect(instance.destroyStub).toHaveBeenCalledTimes(0);

  // disable plugin again
  store.dispatch(
    starPlugin({
      plugin: Plugin2,
      selectedApp: client.query.app,
    }),
  );

  expect(client.sandyPluginStates.get(Plugin2.id)).toBeUndefined();
  expect(instance.connectStub).toHaveBeenCalledTimes(0);
  // disconnect wasn't called because connect was never called
  expect(instance.disconnectStub).toHaveBeenCalledTimes(0);
  expect(instance.destroyStub).toHaveBeenCalledTimes(1);
});

test('it trigger hooks for background plugins', async () => {
  const {client} = await createMockFlipperWithPlugin(TestPlugin, {
    onSend(method) {
      if (method === 'getBackgroundPlugins') {
        return {plugins: [TestPlugin.id]};
      }
    },
  });
  const pluginInstance: PluginApi = client.sandyPluginStates.get(TestPlugin.id)!
    .instanceApi;
  expect(client.isBackgroundPlugin(TestPlugin.id)).toBeTruthy();
  expect(pluginInstance.destroyStub).toHaveBeenCalledTimes(0);
  expect(pluginInstance.connectStub).toHaveBeenCalledTimes(1);
  expect(pluginInstance.disconnectStub).toHaveBeenCalledTimes(0);

  // close client
  client.close();
  expect(client.sandyPluginStates.has(TestPlugin.id)).toBeFalsy();
  expect(pluginInstance.destroyStub).toHaveBeenCalledTimes(1);
  expect(pluginInstance.connectStub).toHaveBeenCalledTimes(1);
  expect(pluginInstance.disconnectStub).toHaveBeenCalledTimes(1);
});

test('it can send messages from sandy clients', async () => {
  let testMethodCalledWith: any = undefined;
  const {client} = await createMockFlipperWithPlugin(TestPlugin, {
    onSend(method, params) {
      if (method === 'execute') {
        testMethodCalledWith = params;
        return {};
      }
    },
  });
  const pluginInstance: PluginApi = client.sandyPluginStates.get(TestPlugin.id)!
    .instanceApi;
  // without rendering, non-bg plugins won't connect automatically,
  client.initPlugin(TestPlugin.id);
  await pluginInstance.send('test', {test: 3});
  expect(testMethodCalledWith).toMatchInlineSnapshot(`
    Object {
      "api": "TestPlugin",
      "method": "test",
      "params": Object {
        "test": 3,
      },
    }
  `);
});
