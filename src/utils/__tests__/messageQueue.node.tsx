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
import {GK} from 'flipper';
import {selectPlugin} from '../../reducers/connections';
import {processMessageQueue} from '../messageQueue';
import {getPluginKey} from '../pluginUtils';
import {TestIdler} from '../Idler';

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

test('will process event with GK disabled', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({store, sendMessage}) => {
      expect(store.getState().connections.selectedPlugin).toBe('TestPlugin');
      sendMessage('inc', {});
      expect(store.getState().pluginStates).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#unit_test#serial#TestPlugin": Object {
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
                    "TestApp#Android#unit_test#serial#TestPlugin": Object {
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

test('queue - events are NOT processed immediately if plugin is NOT selected', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        store.dispatch(
          selectPlugin({
            selectedPlugin: 'DeviceLogs',
            selectedApp: null,
            deepLinkPayload: null,
          }),
        );
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
            "TestApp#Android#unit_test#serial#TestPlugin": Array [
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
        await processMessageQueue(client, TestPlugin, pluginKey, store);
        expect(store.getState().pluginStates).toEqual({
          [pluginKey]: {
            count: 3,
          },
        });

        expect(store.getState().pluginMessageQueue).toEqual({
          [pluginKey]: [],
        });
      });
    },
  );
});

test('queue - events processing will be paused', async () => {
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      await GK.withWhitelistedGK('flipper_event_queue', async () => {
        // select a different plugin
        store.dispatch(
          selectPlugin({
            selectedPlugin: 'DeviceLogs',
            selectedApp: null,
            deepLinkPayload: null,
          }),
        );

        sendMessage('inc', {});
        sendMessage('inc', {delta: 3});
        sendMessage('inc', {delta: 5});

        // process the message
        const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

        // controlled idler will signal and and off that idling is needed
        const idler = new TestIdler();

        const p = processMessageQueue(
          client,
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
        // select a different plugin
        store.dispatch(
          selectPlugin({
            selectedPlugin: 'DeviceLogs',
            selectedApp: null,
            deepLinkPayload: null,
          }),
        );

        sendMessage('inc', {});
        sendMessage('inc', {delta: 2});
        sendMessage('inc', {delta: 3});

        // process the message
        const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

        const idler = new TestIdler();

        const p = processMessageQueue(
          client,
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
        // select a different plugin
        store.dispatch(
          selectPlugin({
            selectedPlugin: 'DeviceLogs',
            selectedApp: null,
            deepLinkPayload: null,
          }),
        );

        sendMessage('inc', {});
        sendMessage('inc', {delta: 2});
        sendMessage('inc', {delta: 3});
        sendMessage('inc', {delta: 4});
        sendMessage('inc', {delta: 5});

        // process the message
        const pluginKey = getPluginKey(client.id, device, TestPlugin.id);

        const idler = new TestIdler();

        const p = processMessageQueue(
          client,
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
        // select a different plugin
        store.dispatch(
          selectPlugin({
            selectedPlugin: 'DeviceLogs',
            selectedApp: null,
            deepLinkPayload: null,
          }),
        );

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
