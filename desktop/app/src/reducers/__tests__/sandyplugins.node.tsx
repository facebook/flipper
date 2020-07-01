/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createMockFlipperWithPlugin,
  createMockPluginDetails,
} from '../../test-utils/createMockFlipperWithPlugin';
import {Store, Client} from '../../';
import {selectPlugin, starPlugin} from '../../reducers/connections';
import {registerPlugins} from '../../reducers/plugins';
import {
  SandyPluginDefinition,
  SandyPluginInstance,
  FlipperClient,
} from 'flipper-plugin';

interface PersistedState {
  count: 1;
}

const pluginDetails = createMockPluginDetails();

let TestPlugin: SandyPluginDefinition;

beforeEach(() => {
  function plugin(client: FlipperClient) {
    const destroyStub = jest.fn();

    client.onDestroy(destroyStub);

    return {
      destroyStub,
    };
  }
  TestPlugin = new SandyPluginDefinition(pluginDetails, {
    plugin: jest.fn().mockImplementation(plugin) as typeof plugin,
    Component: jest.fn().mockImplementation(() => null),
  });
});

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
  expect(TestPlugin.module.plugin).toBeCalledTimes(1);
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBeInstanceOf(
    SandyPluginInstance,
  );

  selectTestPlugin(store, client);
  // TODO: make sure lifecycle 'activated' or something is triggered T68683507
});

test('it should cleanup a plugin if disabled', async () => {
  const {client, store} = await createMockFlipperWithPlugin(TestPlugin);

  expect(TestPlugin.module.plugin).toBeCalledTimes(1);
  const pluginInstance = client.sandyPluginStates.get(TestPlugin.id)!;
  expect(pluginInstance).toBeInstanceOf(SandyPluginInstance);
  expect(pluginInstance.instanceApi.destroyStub).toHaveBeenCalledTimes(0);

  // unstar
  starTestPlugin(store, client);
  expect(client.sandyPluginStates.has(TestPlugin.id)).toBeFalsy();
  expect(pluginInstance.instanceApi.destroyStub).toHaveBeenCalledTimes(1);
});

test('it should cleanup if client is removed', async () => {
  const {client} = await createMockFlipperWithPlugin(TestPlugin);
  const pluginInstance = client.sandyPluginStates.get(TestPlugin.id)!;
  expect(pluginInstance.instanceApi.destroyStub).toHaveBeenCalledTimes(0);

  // close client
  client.close();
  expect(client.sandyPluginStates.has(TestPlugin.id)).toBeFalsy();
  expect(pluginInstance.instanceApi.destroyStub).toHaveBeenCalledTimes(1);
});

test('it should not initialize a sandy plugin if not enabled', async () => {
  const {client, store} = await createMockFlipperWithPlugin(TestPlugin);

  const Plugin2 = new SandyPluginDefinition(
    createMockPluginDetails({
      name: 'Plugin2',
      id: 'Plugin2',
    }),
    {
      plugin: jest.fn().mockImplementation((client) => {
        const destroyStub = jest.fn();
        client.onDestroy(destroyStub);
        return {destroyStub};
      }),
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
  expect(Plugin2.module.plugin).toBeCalledTimes(0);

  store.dispatch(
    starPlugin({
      plugin: Plugin2,
      selectedApp: client.query.app,
    }),
  );

  expect(client.sandyPluginStates.get(Plugin2.id)).toBeInstanceOf(
    SandyPluginInstance,
  );
  const destroyStub = client.sandyPluginStates.get(Plugin2.id)!.instanceApi
    .destroyStub;
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBe(pluginState1); // not reinitialized

  expect(TestPlugin.module.plugin).toBeCalledTimes(1);
  expect(Plugin2.module.plugin).toBeCalledTimes(1);
  expect(destroyStub).toHaveBeenCalledTimes(0);

  // disable plugin again
  store.dispatch(
    starPlugin({
      plugin: Plugin2,
      selectedApp: client.query.app,
    }),
  );

  expect(client.sandyPluginStates.get(Plugin2.id)).toBeUndefined();
  expect(destroyStub).toHaveBeenCalledTimes(1);
});

// TODO: T68683449 state is persisted if a plugin connects and reconnects
