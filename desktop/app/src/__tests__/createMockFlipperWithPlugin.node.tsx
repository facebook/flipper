/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createMockFlipperWithPlugin} from '../test-utils/createMockFlipperWithPlugin';
import {FlipperPlugin} from '../plugin';
import {TestIdler} from '../utils/Idler';

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
    _payload: {},
  ) {
    if (method === 'inc') {
      return Object.assign({}, persistedState, {
        count: persistedState.count + 1,
      });
    }
    return persistedState;
  }

  render() {
    return null;
  }
}

test('can create a Fake flipper', async () => {
  const {client, device, store, sendMessage} =
    await createMockFlipperWithPlugin(TestPlugin, {disableLegacyWrapper: true});
  expect(client).toBeTruthy();
  expect(device).toBeTruthy();
  expect(store).toBeTruthy();
  expect(sendMessage).toBeTruthy();
  expect(client.plugins.has(TestPlugin.id)).toBe(true);
  expect(store.getState().connections).toMatchSnapshot();
  expect(store.getState().plugins).toMatchSnapshot();
  sendMessage('inc', {});
  expect(store.getState().pluginStates).toMatchInlineSnapshot(`
        Object {
          "TestApp#Android#MockAndroidDevice#serial#TestPlugin": Object {
            "count": 1,
          },
        }
      `);
});

const testIdler = new TestIdler();

function testOnStatusMessage() {
  // emtpy stub
}

test('can create a Fake flipper with legacy wrapper', async () => {
  const {client, device, store, sendMessage} =
    await createMockFlipperWithPlugin(TestPlugin);
  expect(client).toBeTruthy();
  expect(device).toBeTruthy();
  expect(store).toBeTruthy();
  expect(sendMessage).toBeTruthy();
  expect(client.plugins.has(TestPlugin.id)).toBe(true);
  expect(client.sandyPluginStates.has(TestPlugin.id)).toBe(true);
  const state = store.getState();
  expect(state.connections).toMatchSnapshot();
  expect(state.plugins).toMatchSnapshot();
  sendMessage('inc', {});
  expect(
    await state.connections.clients[0].sandyPluginStates
      .get(TestPlugin.id)!
      .exportState(testIdler, testOnStatusMessage),
  ).toMatchInlineSnapshot(`"{\\"count\\":1}"`);
});
