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
import {SandyPluginDefinition, SandyPluginInstance} from 'flipper-plugin';

interface PersistedState {
  count: 1;
}

const pluginDetails = {
  id: 'TestPlugin',
  dir: '',
  name: 'TestPlugin',
  specVersion: 0,
  entry: '',
  isDefault: false,
  main: '',
  source: '',
  title: 'Testing Plugin',
  version: '',
} as const;

let TestPlugin: SandyPluginDefinition;

beforeEach(() => {
  TestPlugin = new SandyPluginDefinition(pluginDetails, {
    plugin: jest.fn().mockImplementation(() => ({})),
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
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBeInstanceOf(
    SandyPluginInstance,
  );

  // unstar
  starTestPlugin(store, client);
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBeUndefined();
  // TODO: make sure onDestroy is  called T68683507
});

test('it should not initialize a sandy plugin if not enabled', async () => {
  const {client, store} = await createMockFlipperWithPlugin(TestPlugin);

  const Plugin2 = new SandyPluginDefinition(
    {
      ...pluginDetails,
      name: 'Plugin2',
      id: 'Plugin2',
    },
    {
      plugin: jest.fn().mockImplementation(() => ({})),
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
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBe(pluginState1); // not reinitialized

  expect(TestPlugin.module.plugin).toBeCalledTimes(1);
  expect(Plugin2.module.plugin).toBeCalledTimes(1);

  // disable plugin again
  store.dispatch(
    starPlugin({
      plugin: Plugin2,
      selectedApp: client.query.app,
    }),
  );

  expect(client.sandyPluginStates.get(Plugin2.id)).toBeUndefined();
  // TODO: test destroy hook is called T68683507
});

// TODO: T68683449 state is persisted if a plugin connects and reconnects
