/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin, FlipperDevicePlugin} from '../../plugin';
import {createMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {Store, Client, sleep} from '../../';
import {
  selectPlugin,
  starPlugin,
  selectClient,
  selectDevice,
} from '../../reducers/connections';
import {processMessageQueue} from '../messageQueue';
import {getPluginKey} from '../pluginUtils';
import {TestIdler} from '../Idler';
import pluginMessageQueue, {
  State,
  queueMessages,
} from '../../reducers/pluginMessageQueue';
import {registerPlugins} from '../../reducers/plugins';

interface PersistedState {
  count: 1;
}

class TestPlugin extends FlipperPlugin<any, any, any> {
  static id = 'TestPlugin';

  static defaultPersistedState = {
    count: 0,
  };

  static persistedStateReducer(
    persistedState: PersistedState,
    method: string,
    payload: {delta?: number},
  ) {
    if (method === 'inc') {
      return Object.assign({}, persistedState, {
        count: persistedState.count + ((payload && payload?.delta) || 1),
      });
    }
    return persistedState;
  }

  render() {
    return null;
  }
}

function starTestPlugin(store: Store, client: Client) {
  store.dispatch(
    starPlugin({
      selectedPlugin: TestPlugin.id,
      selectedApp: client.query.app,
    }),
  );
}

function selectDeviceLogs(store: Store) {
  store.dispatch(
    selectPlugin({
      selectedPlugin: 'DeviceLogs',
      selectedApp: null,
      deepLinkPayload: null,
      selectedDevice: store.getState().connections.selectedDevice!,
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

test('queue - events are processed immediately if plugin is selected', async () => {
  const {store, client, sendMessage} = await createMockFlipperWithPlugin(
    TestPlugin,
  );
  expect(store.getState().connections.selectedPlugin).toBe('TestPlugin');
  sendMessage('noop', {});
  sendMessage('noop', {});
  sendMessage('inc', {});
  sendMessage('inc', {delta: 4});
  sendMessage('noop', {});
  client.flushMessageBuffer();
  expect(store.getState().pluginStates).toMatchInlineSnapshot(`
          Object {
            "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Object {
              "count": 5,
            },
          }
        `);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(
    `Object {}`,
  );
});

test('queue - events are NOT processed immediately if plugin is NOT selected (but enabled)', async () => {
  const {
    store,
    client,
    sendMessage,
    device,
  } = await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);
  expect(store.getState().connections.selectedPlugin).not.toBe('TestPlugin');

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});
  expect(store.getState().pluginStates).toMatchInlineSnapshot(`Object {}`);
  // the first message is already visible cause of the leading debounce
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {},
            },
          ],
        }
      `);
  client.flushMessageBuffer();
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {},
            },
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {
                "delta": 2,
              },
            },
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {
                "delta": 3,
              },
            },
          ],
        }
      `);

  // process the message
  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);
  await processMessageQueue(TestPlugin, pluginKey, store);
  expect(store.getState().pluginStates).toEqual({
    [pluginKey]: {
      count: 6,
    },
  });

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [],
  });

  // unstar, but, messages still arrives because selected
  starTestPlugin(store, client);
  selectTestPlugin(store, client);
  sendMessage('inc', {delta: 3});
  client.flushMessageBuffer();
  // active, immediately processed
  expect(store.getState().pluginStates).toEqual({
    [pluginKey]: {
      count: 9,
    },
  });

  // different plugin, and not starred, message will never arrive
  selectDeviceLogs(store);
  sendMessage('inc', {delta: 4});
  client.flushMessageBuffer();
  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [],
  });

  // star again, plugin still not selected, message is queued
  starTestPlugin(store, client);
  sendMessage('inc', {delta: 5});
  client.flushMessageBuffer();

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [{api: 'TestPlugin', method: 'inc', params: {delta: 5}}],
  });
});

test('queue - events are queued for plugins that are favorite when app is not selected', async () => {
  const {
    device,
    store,
    sendMessage,
    createClient,
  } = await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);
  expect(store.getState().connections.selectedPlugin).not.toBe('TestPlugin');

  const client2 = createClient(device, 'TestApp2');
  store.dispatch(selectClient(client2.id));

  // Now we send a message to the second client, it should arrive,
  // as the plugin was enabled already on the first client as well
  sendMessage('inc', {delta: 2});
  expect(store.getState().pluginStates).toMatchInlineSnapshot(`Object {}`);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
          Object {
            "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
              Object {
                "api": "TestPlugin",
                "method": "inc",
                "params": Object {
                  "delta": 2,
                },
              },
            ],
          }
        `);
});

test('queue - events are queued for plugins that are favorite when app is selected on different device', async () => {
  const {
    client,
    store,
    sendMessage,
    createDevice,
    createClient,
  } = await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);
  expect(store.getState().connections.selectedPlugin).not.toBe('TestPlugin');

  const device2 = createDevice('serial2');
  const client2 = createClient(device2, client.query.app); // same app id
  store.dispatch(selectDevice(device2));
  store.dispatch(selectClient(client2.id));

  // Now we send a message to the second client, it should arrive,
  // as the plugin was enabled already on the first client as well
  sendMessage('inc', {delta: 2});
  expect(store.getState().pluginStates).toMatchInlineSnapshot(`Object {}`);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
          Object {
            "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
              Object {
                "api": "TestPlugin",
                "method": "inc",
                "params": Object {
                  "delta": 2,
                },
              },
            ],
          }
        `);
});

test('queue - events processing will be paused', async () => {
  const {
    client,
    device,
    store,
    sendMessage,
  } = await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 3});
  sendMessage('inc', {delta: 5});
  client.flushMessageBuffer();

  // process the message
  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

  // controlled idler will signal and and off that idling is needed
  const idler = new TestIdler();

  const p = processMessageQueue(TestPlugin, pluginKey, store, undefined, idler);

  expect(store.getState().pluginStates).toEqual({
    [pluginKey]: {
      count: 4,
    },
  });

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [{api: 'TestPlugin', method: 'inc', params: {delta: 5}}],
  });

  await idler.next();
  expect(store.getState().pluginStates).toEqual({
    [pluginKey]: {
      count: 9,
    },
  });

  expect(store.getState().pluginMessageQueue).toEqual({
    [pluginKey]: [],
  });

  // don't idle anymore
  idler.run();
  await p;
});

test('queue - messages that arrive during processing will be queued', async () => {
  const {
    client,
    device,
    store,
    sendMessage,
  } = await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});
  client.flushMessageBuffer();

  // process the message
  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

  const idler = new TestIdler();

  const p = processMessageQueue(TestPlugin, pluginKey, store, undefined, idler);

  // first message is consumed
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
  expect(store.getState().pluginStates[pluginKey].count).toBe(3);

  // Select the current plugin as active, still, messages should end up in the queue
  store.dispatch(
    selectPlugin({
      selectedPlugin: TestPlugin.id,
      selectedApp: client.id,
      deepLinkPayload: null,
      selectedDevice: device,
    }),
  );
  expect(store.getState().connections.selectedPlugin).toBe('TestPlugin');

  sendMessage('inc', {delta: 4});
  client.flushMessageBuffer();
  // should not be processed yet
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(2);
  expect(store.getState().pluginStates[pluginKey].count).toBe(3);

  await idler.next();
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(0);
  expect(store.getState().pluginStates[pluginKey].count).toBe(10);

  idler.run();
  await p;
});

test('queue - processing can be cancelled', async () => {
  const {
    client,
    device,
    store,
    sendMessage,
  } = await createMockFlipperWithPlugin(TestPlugin);
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

  const p = processMessageQueue(TestPlugin, pluginKey, store, undefined, idler);

  // first message is consumed
  await idler.next();
  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
  expect(store.getState().pluginStates[pluginKey].count).toBe(10);

  idler.cancel();

  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
  expect(store.getState().pluginStates[pluginKey].count).toBe(10);
  await p;
});

test('queue - make sure resetting plugin state clears the message queue', async () => {
  const {
    client,
    device,
    store,
    sendMessage,
  } = await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  client.flushMessageBuffer();

  const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

  expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(2);

  store.dispatch({
    type: 'CLEAR_PLUGIN_STATE',
    payload: {clientId: client.id, devicePlugins: new Set()},
  });

  expect(store.getState().pluginMessageQueue[pluginKey]).toBe(undefined);
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
    params: {i: i}, // ~50001
  });
});

test('client - incoming messages are buffered and flushed together', async () => {
  class StubDeviceLogs extends FlipperDevicePlugin<any, any, any> {
    static id = 'DevicePlugin';

    static supportsDevice() {
      return true;
    }

    static persistedStateReducer = jest.fn();
  }

  const {
    client,
    store,
    device,
    sendMessage,
  } = await createMockFlipperWithPlugin(TestPlugin);
  selectDeviceLogs(store);

  store.dispatch(registerPlugins([StubDeviceLogs]));
  sendMessage('inc', {});
  sendMessage('inc', {delta: 2});
  sendMessage('inc', {delta: 3});

  // send a message to device logs
  client.onMessage(
    JSON.stringify({
      method: 'execute',
      params: {
        api: 'DevicePlugin',
        method: 'log',
        params: {line: 'suff'},
      },
    }),
  );

  expect(store.getState().pluginStates).toMatchInlineSnapshot(`Object {}`);
  // the first message is already visible cause of the leading debounce
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {},
            },
          ],
        }
      `);
  expect(client.messageBuffer).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#DevicePlugin": Object {
            "messages": Array [
              Object {
                "api": "DevicePlugin",
                "method": "log",
                "params": Object {
                  "line": "suff",
                },
              },
            ],
            "plugin": [Function],
          },
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Object {
            "messages": Array [
              Object {
                "api": "TestPlugin",
                "method": "inc",
                "params": Object {
                  "delta": 2,
                },
              },
              Object {
                "api": "TestPlugin",
                "method": "inc",
                "params": Object {
                  "delta": 3,
                },
              },
            ],
            "plugin": [Function],
          },
        }
      `);

  await sleep(500);
  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#DevicePlugin": Array [
            Object {
              "api": "DevicePlugin",
              "method": "log",
              "params": Object {
                "line": "suff",
              },
            },
          ],
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {},
            },
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {
                "delta": 2,
              },
            },
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {
                "delta": 3,
              },
            },
          ],
        }
      `);
  expect(client.messageBuffer).toMatchInlineSnapshot(`Object {}`);
  expect(StubDeviceLogs.persistedStateReducer.mock.calls).toMatchInlineSnapshot(
    `Array []`,
  );

  // tigger processing the queue
  const pluginKey = getPluginKey(client.id, device, StubDeviceLogs.id);
  await processMessageQueue(StubDeviceLogs, pluginKey, store);

  expect(StubDeviceLogs.persistedStateReducer.mock.calls)
    .toMatchInlineSnapshot(`
        Array [
          Array [
            Object {},
            "log",
            Object {
              "line": "suff",
            },
          ],
        ]
      `);

  expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#DevicePlugin": Array [],
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {},
            },
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {
                "delta": 2,
              },
            },
            Object {
              "api": "TestPlugin",
              "method": "inc",
              "params": Object {
                "delta": 3,
              },
            },
          ],
        }
      `);
});
