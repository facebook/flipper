/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin} from '../../plugin';
import {
  createMockFlipperWithPlugin,
  wrapSandy,
} from '../../__tests__/test-utils/createMockFlipperWithPlugin';
import {sleep} from 'flipper-common';
import {Store} from '../../reducers';
import Client from '../../Client';

import {
  selectPlugin,
  selectClient,
  selectDevice,
} from '../../reducers/connections';
import {processMessageQueue} from '../messageQueue';
import {getPluginKey} from '../pluginKey';
import {TestIdler} from '../Idler';
import {registerPlugins} from '../../reducers/plugins';
import {
  _SandyPluginDefinition,
  TestUtils,
  PluginClient,
  _SandyPluginInstance,
} from 'flipper-plugin';
import {switchPlugin} from '../../reducers/pluginManager';
import pluginMessageQueue, {
  State,
  queueMessages,
} from '../../reducers/pluginMessageQueue';
import {awaitPluginCommandQueueEmpty} from '../../dispatcher/pluginManager';

type Events = {
  inc: {
    delta?: number;
  };
};

function plugin(client: PluginClient<Events, {}>) {
  const state = {
    count: 0,
  };

  client.onMessage('inc', (params) => {
    state.count += params.delta || 1;
  });

  return {
    state,
  };
}

const TestPlugin = new _SandyPluginDefinition(
  TestUtils.createMockPluginDetails(),
  {
    plugin,
    Component() {
      return null;
    },
  },
);

async function switchTestPlugin(store: Store, client: Client) {
  store.dispatch(
    switchPlugin({
      plugin: TestPlugin,
      selectedApp: client.query.app,
    }),
  );
  await awaitPluginCommandQueueEmpty(store);
}

function selectDeviceLogs(store: Store) {
  store.dispatch(
    selectPlugin({
      selectedPlugin: 'DeviceLogs',
      selectedAppId: null,
      deepLinkPayload: null,
      selectedDevice: store.getState().connections.selectedDevice!,
    }),
  );
}

function selectTestPlugin(store: Store, client: Client) {
  store.dispatch(
    selectPlugin({
      selectedPlugin: TestPlugin.id,
      selectedAppId: client.id,
      deepLinkPayload: null,
      selectedDevice: store.getState().connections.selectedDevice!,
    }),
  );
}

function getTestPluginState(
  client: Client,
): ReturnType<typeof plugin>['state'] {
  return client.sandyPluginStates.get(TestPlugin.id)!.instanceApi.state;
}

test('queue - events are processed immediately if plugin is selected', async () => {
  const {store, client, sendMessage} =
    await createMockFlipperWithPlugin(TestPlugin);
  expect(store.getState().connections.selectedPlugin).toBe('TestPlugin');
  sendMessage('noop', {});
  sendMessage('noop', {});
  sendMessage('inc', {});
  sendMessage('inc', {delta: 4});
  sendMessage('noop', {});
  client.flushMessageBuffer();
  expect(getTestPluginState(client)).toMatchInlineSnapshot(`
    {
      "count": 5,
    }
  `);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`{}`);
});

test('queue - events are NOT processed immediately if plugin is NOT selected (but enabled)', async () => {
  const {store, client, sendMessage, device} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);
  expect(store.getState().connections.selectedPlugin).not.toBe('TestPlugin');

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});
  expect(getTestPluginState(client).count).toBe(0);
  // the first message is already visible cause of the leading debounce
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {},
        },
      ],
    }
  `);
  client.flushMessageBuffer();
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {},
        },
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 2,
          },
        },
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 3,
          },
        },
      ],
    }
  `);

  // process the message
  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);
  await processMessageQueue(
    client.sandyPluginStates.get(TestPlugin.id)!,
    pluginKey,
    store,
  );
  expect(getTestPluginState(client)).toEqual({
    count: 6,
  });

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [],
  });

  // disable. Messages don't arrive anymore
  await switchTestPlugin(store, client);
  // weird state...
  selectTestPlugin(store, client);
  sendMessage('inc', {delta: 3});
  client.flushMessageBuffer();
  // active, immediately processed
  expect(client.sandyPluginStates.has(TestPlugin.id)).toBe(false);

  // different plugin, and not enabled, message will never arrive
  selectDeviceLogs(store);
  sendMessage('inc', {delta: 4});
  client.flushMessageBuffer();
  expect(client.messageBuffer).toMatchInlineSnapshot(`{}`);
  expect(store.getState().pluginMessageQueue).toEqual({});

  // star again, plugin still not selected, message is queued
  await switchTestPlugin(store, client);
  sendMessage('inc', {delta: 5});
  client.flushMessageBuffer();

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [{api: 'TestPlugin', method: 'inc', params: {delta: 5}}],
  });
});

test('queue - events ARE processed immediately if plugin is NOT selected / enabled BUT NAVIGATION', async () => {
  const NavigationPlugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails({
      id: 'Navigation',
    }),
    {
      plugin,
      Component() {
        return null;
      },
    },
  );
  const {store, client, sendMessage} =
    await createMockFlipperWithPlugin(NavigationPlugin);

  // Pre setup, deselect AND disable
  selectDeviceLogs(store);
  expect(store.getState().connections.selectedPlugin).toBe('DeviceLogs');
  store.dispatch(
    switchPlugin({
      plugin: NavigationPlugin,
      selectedApp: client.query.app,
    }),
  );
  expect(store.getState().connections.enabledPlugins).toMatchInlineSnapshot(`
    {
      "TestApp": [],
    }
  `);

  // ...mesages are still going to arrive
  const pluginState = () =>
    client.sandyPluginStates.get(NavigationPlugin.id)!.instanceApi.state;

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});
  // the first message is already visible cause of the leading debounce
  expect(pluginState().count).toBe(1);
  // message queue was never involved due to the bypass...
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`{}`);
  // flush will make the others visible
  client.flushMessageBuffer();
  expect(pluginState().count).toBe(6);
});

test('queue - events are queued for plugins that are favorite when app is not selected', async () => {
  const {client, device, store, sendMessage, createClient} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);
  expect(store.getState().connections.selectedPlugin).not.toBe('TestPlugin');

  const client2 = await createClient(device, 'TestApp2');
  store.dispatch(selectClient(client2.id));

  // Now we send a message to the second client, it should arrive,
  // as the plugin was enabled already on the first client as well
  sendMessage('inc', {delta: 2});
  expect(getTestPluginState(client)).toEqual({count: 0});
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 2,
          },
        },
      ],
    }
  `);
});

test('queue - events are queued for plugins that are favorite when app is selected on different device', async () => {
  const {client, store, sendMessage, createDevice, createClient} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);
  expect(store.getState().connections.selectedPlugin).not.toBe('TestPlugin');

  const device2 = createDevice({serial: 'serial2'});
  const client2 = await createClient(device2, client.query.app); // same app id
  store.dispatch(selectDevice(device2));
  store.dispatch(selectClient(client2.id));

  // Now we send a message to the first and second client, it should arrive,
  // as the plugin was enabled already on the first client as well
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3}, client2);
  client.flushMessageBuffer();
  client2.flushMessageBuffer();
  expect(getTestPluginState(client)).toEqual({count: 0});
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 2,
          },
        },
      ],
      "TestApp#Android#MockAndroidDevice#serial2#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 3,
          },
        },
      ],
    }
  `);
});

test('queue - events processing will be paused', async () => {
  const {client, device, store, sendMessage} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 3});
  sendMessage('inc', {delta: 5});
  client.flushMessageBuffer();

  // process the message
  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

  // controlled idler will signal and and off that idling is needed
  const idler = new TestIdler();

  const p = processMessageQueue(
    client.sandyPluginStates.get(TestPlugin.id)!,
    pluginKey,
    store,
    undefined,
    idler,
  );

  expect(getTestPluginState(client)).toEqual({
    count: 4,
  });

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [{api: 'TestPlugin', method: 'inc', params: {delta: 5}}],
  });

  await idler.next();
  expect(getTestPluginState(client)).toEqual({
    count: 9,
  });

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [],
  });

  // don't idle anymore
  idler.run();
  await p;
});

test('queue - messages that arrive during processing will be queued', async () => {
  const {client, device, store, sendMessage} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});
  client.flushMessageBuffer();

  // process the message
  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

  const idler = new TestIdler();

  const p = processMessageQueue(
    client.sandyPluginStates.get(TestPlugin.id)!,
    pluginKey,
    store,
    undefined,
    idler,
  );

  // first message is consumed
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
  expect(getTestPluginState(client).count).toBe(3);

  // Select the current plugin as active, still, messages should end up in the queue
  store.dispatch(
    selectPlugin({
      selectedPlugin: TestPlugin.id,
      selectedAppId: client.id,
      deepLinkPayload: null,
      selectedDevice: device,
    }),
  );
  expect(store.getState().connections.selectedPlugin).toBe('TestPlugin');

  sendMessage('inc', {delta: 4});
  client.flushMessageBuffer();
  // should not be processed yet
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(2);
  expect(getTestPluginState(client).count).toBe(3);

  await idler.next();
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(0);
  expect(getTestPluginState(client).count).toBe(10);

  idler.run();
  await p;
});

test('queue - processing can be cancelled', async () => {
  const {client, device, store, sendMessage} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});
  sendMessage('inc', {delta: 4});
  sendMessage('inc', {delta: 5});
  client.flushMessageBuffer();

  // process the message
  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

  const idler = new TestIdler();

  const p = processMessageQueue(
    client.sandyPluginStates.get(TestPlugin.id)!,
    pluginKey,
    store,
    undefined,
    idler,
  );

  // first message is consumed
  await idler.next();
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
  expect(getTestPluginState(client).count).toBe(10);

  idler.cancel();

  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
  expect(getTestPluginState(client).count).toBe(10);
  await p;
});

test('queue - make sure resetting plugin state clears the message queue', async () => {
  const {client, device, store, sendMessage} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  client.flushMessageBuffer();

  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(2);

  store.dispatch({
    type: 'CLEAR_CLIENT_PLUGINS_STATE',
    payload: {clientId: client.id, devicePlugins: new Set()},
  });

  expect(store.getState().pluginMessageQueue[pluginKey]).toBe(undefined);
});

test('client - incoming messages are buffered and flushed together', async () => {
  class StubPlugin extends FlipperPlugin<any, any, any> {
    static id = 'StubPlugin';

    static persistedStateReducer = jest.fn();
  }

  const StubPluginWrapped = wrapSandy(StubPlugin);

  const {client, store, device, sendMessage, pluginKey} =
    await createMockFlipperWithPlugin(TestPlugin, {
      additionalPlugins: [StubPluginWrapped],
    });
  selectDeviceLogs(store);

  store.dispatch(registerPlugins([StubPluginWrapped]));
  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});

  // send a message to device logs
  client.onMessage(
    JSON.stringify({
      method: 'execute',
      params: {
        api: 'StubPlugin',
        method: 'log',
        params: {line: 'suff'},
      },
    }),
  );

  expect(getTestPluginState(client).count).toBe(0);
  // the first message is already visible cause of the leading debounce
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {},
        },
      ],
    }
  `);
  expect(client.messageBuffer).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#StubPlugin": {
        "messages": [
          {
            "api": "StubPlugin",
            "method": "log",
            "params": {
              "line": "suff",
            },
          },
        ],
        "plugin": "[SandyPluginInstance]",
      },
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": {
        "messages": [
          {
            "api": "TestPlugin",
            "method": "inc",
            "params": {
              "delta": 2,
            },
          },
          {
            "api": "TestPlugin",
            "method": "inc",
            "params": {
              "delta": 3,
            },
          },
        ],
        "plugin": "[SandyPluginInstance]",
      },
    }
  `);
  expect(client.messageBuffer[pluginKey].plugin).toBeInstanceOf(
    _SandyPluginInstance,
  );

  await sleep(500);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#StubPlugin": [
        {
          "api": "StubPlugin",
          "method": "log",
          "params": {
            "line": "suff",
          },
        },
      ],
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {},
        },
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 2,
          },
        },
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 3,
          },
        },
      ],
    }
  `);
  expect(client.messageBuffer).toMatchInlineSnapshot(`{}`);
  expect(StubPlugin.persistedStateReducer.mock.calls).toMatchInlineSnapshot(
    `[]`,
  );

  // tigger processing the queue
  const pluginKeyDevice = getPluginKey(client.id, device, StubPlugin.id);
  await processMessageQueue(
    client.sandyPluginStates.get(StubPlugin.id)!,
    pluginKeyDevice,
    store,
  );

  expect(StubPlugin.persistedStateReducer.mock.calls).toMatchInlineSnapshot(`
    [
      [
        undefined,
        "log",
        {
          "line": "suff",
        },
      ],
    ]
  `);

  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#StubPlugin": [],
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {},
        },
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 2,
          },
        },
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {
            "delta": 3,
          },
        },
      ],
    }
  `);
});

test('queue - messages that have not yet flushed be lost when disabling the plugin', async () => {
  const {client, store, sendMessage, pluginKey} =
    await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});

  expect(client.messageBuffer).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": {
        "messages": [
          {
            "api": "TestPlugin",
            "method": "inc",
            "params": {
              "delta": 2,
            },
          },
        ],
        "plugin": "[SandyPluginInstance]",
      },
    }
  `);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
    {
      "TestApp#Android#MockAndroidDevice#serial#TestPlugin": [
        {
          "api": "TestPlugin",
          "method": "inc",
          "params": {},
        },
      ],
    }
  `);

  // disable
  await switchTestPlugin(store, client);
  expect(client.messageBuffer).toMatchInlineSnapshot(`{}`);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`{}`);

  // re-enable, no messages arrive
  await switchTestPlugin(store, client);
  client.flushMessageBuffer();
  processMessageQueue(
    client.sandyPluginStates.get(TestPlugin.id)!,
    pluginKey,
    store,
  );
  expect(getTestPluginState(client)).toEqual({count: 0});
});

test('queue will be cleaned up when it exceeds maximum size', () => {
  let state: State = {};
  const pluginKey = 'test';
  const queueSize = 5000;
  let i = 0;
  for (i = 0; i < queueSize; i++) {
    state = pluginMessageQueue(
      state,
      queueMessages(pluginKey, [{method: 'test', params: {i}}], queueSize),
    );
  }
  // almost full
  expect(state[pluginKey][0]).toEqual({method: 'test', params: {i: 0}});
  expect(state[pluginKey].length).toBe(queueSize); // ~5000
  expect(state[pluginKey][queueSize - 1]).toEqual({
    method: 'test',
    params: {i: queueSize - 1}, // ~4999
  });

  state = pluginMessageQueue(
    state,
    queueMessages(pluginKey, [{method: 'test', params: {i: ++i}}], queueSize),
  );

  const newLength = Math.ceil(0.9 * queueSize) + 1; // ~4500
  expect(state[pluginKey].length).toBe(newLength);
  expect(state[pluginKey][0]).toEqual({
    method: 'test',
    params: {i: queueSize - newLength + 1}, // ~500
  });
  expect(state[pluginKey][newLength - 1]).toEqual({
    method: 'test',
    params: {i}, // ~50001
  });
});
