/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin} from '../../plugin';
import {createMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {GK, Store, Client} from '../../';
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
  queueMessage,
} from '../../reducers/pluginMessageQueue';

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

test('will process event with GK disabled', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({store, sendMessage}) => {
      expect(store.getState().connections.selectedPlugin).toBe('TestPlugin');
      sendMessage('inc', {});
      expect(store.getState().pluginStates).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Object {
            "count": 1,
          },
        }
      `);
    },
  );
});

test('queue - events are processed immediately if plugin is selected', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', () => {
        expect(store.getState().connections.selectedPlugin).toBe('TestPlugin');
        sendMessage('inc', {});
        expect(store.getState().pluginStates).toMatchInlineSnapshot(`
          Object {
            "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Object {
              "count": 1,
            },
          }
        `);
        expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(
          `Object {}`,
        );
      });
    },
  );
});

test('queue - events are NOT processed immediately if plugin is NOT selected (but starred)', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        selectDeviceLogs(store);
        expect(store.getState().connections.selectedPlugin).not.toBe(
          'TestPlugin',
        );

        sendMessage('inc', {});
        sendMessage('inc', {delta: 2});
        expect(store.getState().pluginStates).toMatchInlineSnapshot(
          `Object {}`,
        );
        expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(`
          Object {
            "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
              Object {
                "method": "inc",
                "params": Object {},
              },
              Object {
                "method": "inc",
                "params": Object {
                  "delta": 2,
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
            count: 3,
          },
        });

        expect(store.getState().pluginMessageQueue).toEqual({
          [pluginKey]: [],
        });

        // unstar, but, messages still arrives because selected
        starTestPlugin(store, client);
        selectTestPlugin(store, client);
        sendMessage('inc', {delta: 3});
        // active, immediately processed
        expect(store.getState().pluginStates).toEqual({
          [pluginKey]: {
            count: 6,
          },
        });

        // different plugin, and not starred, message will never arrive
        selectDeviceLogs(store);
        sendMessage('inc', {delta: 4});
        expect(store.getState().pluginMessageQueue).toEqual({
          [pluginKey]: [],
        });

        // star again, plugin still not selected, message is queued
        starTestPlugin(store, client);
        sendMessage('inc', {delta: 5});

        expect(store.getState().pluginMessageQueue).toEqual({
          [pluginKey]: [{method: 'inc', params: {delta: 5}}],
        });
      });
    },
  );
});

test('queue - events are queued for plugins that are favorite when app is not selected', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({device, store, sendMessage, createClient}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        selectDeviceLogs(store);
        expect(store.getState().connections.selectedPlugin).not.toBe(
          'TestPlugin',
        );

        const client2 = createClient(device, 'TestApp2');
        store.dispatch(selectClient(client2.id));

        // Now we send a message to the second client, it should arrive,
        // as the plugin was enabled already on the first client as well
        sendMessage('inc', {delta: 2});
        expect(store.getState().pluginStates).toMatchInlineSnapshot(
          `Object {}`,
        );
        expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(
          `
          Object {
            "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
              Object {
                "method": "inc",
                "params": Object {
                  "delta": 2,
                },
              },
            ],
          }
        `,
        );
      });
    },
  );
});

test('queue - events are queued for plugins that are favorite when app is selected on different device', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, store, sendMessage, createDevice, createClient}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        selectDeviceLogs(store);
        expect(store.getState().connections.selectedPlugin).not.toBe(
          'TestPlugin',
        );

        const device2 = createDevice('serial2');
        const client2 = createClient(device2, client.query.app); // same app id
        store.dispatch(selectDevice(device2));
        store.dispatch(selectClient(client2.id));

        // Now we send a message to the second client, it should arrive,
        // as the plugin was enabled already on the first client as well
        sendMessage('inc', {delta: 2});
        expect(store.getState().pluginStates).toMatchInlineSnapshot(
          `Object {}`,
        );
        expect(store.getState().pluginMessageQueue).toMatchInlineSnapshot(
          `
          Object {
            "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Array [
              Object {
                "method": "inc",
                "params": Object {
                  "delta": 2,
                },
              },
            ],
          }
        `,
        );
      });
    },
  );
});

test('queue - events processing will be paused', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        selectDeviceLogs(store);

        sendMessage('inc', {});
        sendMessage('inc', {delta: 3});
        sendMessage('inc', {delta: 5});

        // process the message
        const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

        // controlled idler will signal and and off that idling is needed
        const idler = new TestIdler();

        const p = processMessageQueue(
          TestPlugin,
          pluginKey,
          store,
          undefined,
          idler,
        );

        expect(store.getState().pluginStates).toEqual({
          [pluginKey]: {
            count: 4,
          },
        });

        expect(store.getState().pluginMessageQueue).toEqual({
          [pluginKey]: [{method: 'inc', params: {delta: 5}}],
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
    },
  );
});

test('queue - messages that arrive during processing will be queued', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        selectDeviceLogs(store);

        sendMessage('inc', {});
        sendMessage('inc', {delta: 2});
        sendMessage('inc', {delta: 3});

        // process the message
        const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

        const idler = new TestIdler();

        const p = processMessageQueue(
          TestPlugin,
          pluginKey,
          store,
          undefined,
          idler,
        );

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
        // should not be processed yet
        expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(2);
        expect(store.getState().pluginStates[pluginKey].count).toBe(3);

        await idler.next();
        expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(0);
        expect(store.getState().pluginStates[pluginKey].count).toBe(10);

        idler.run();
        await p;
      });
    },
  );
});

test('queue - processing can be cancelled', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        selectDeviceLogs(store);

        sendMessage('inc', {});
        sendMessage('inc', {delta: 2});
        sendMessage('inc', {delta: 3});
        sendMessage('inc', {delta: 4});
        sendMessage('inc', {delta: 5});

        // process the message
        const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

        const idler = new TestIdler();

        const p = processMessageQueue(
          TestPlugin,
          pluginKey,
          store,
          undefined,
          idler,
        );

        // first message is consumed
        await idler.next();
        expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
        expect(store.getState().pluginStates[pluginKey].count).toBe(10);

        idler.cancel();

        expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(1);
        expect(store.getState().pluginStates[pluginKey].count).toBe(10);
        await p;
      });
    },
  );
});

test('queue - make sure resetting plugin state clears the message queue', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        selectDeviceLogs(store);

        sendMessage('inc', {});
        sendMessage('inc', {delta: 2});

        const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

        expect(store.getState().pluginMessageQueue[pluginKey].length).toBe(2);

        store.dispatch({
          type: 'CLEAR_PLUGIN_STATE',
          payload: {clientId: client.id, devicePlugins: new Set()},
        });

        expect(store.getState().pluginMessageQueue[pluginKey]).toBe(undefined);
      });
    },
  );
});

test('queue will be cleaned up when it exceeds maximum size', () => {
  let state: State = {};
  const pluginKey = 'test';
  const queueSize = 5000;
  let i = 0;
  for (i = 0; i < queueSize; i++) {
    state = pluginMessageQueue(
      state,
      queueMessage(pluginKey, 'test', {i}, queueSize),
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
    queueMessage(pluginKey, 'test', {i: ++i}, queueSize),
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
