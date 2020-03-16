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
  await createMockFlipperWithPlugin(
    TestPlugin,
    async ({client, device, store, sendMessage}) => {
      expect(client).toBeTruthy();
      expect(device).toBeTruthy();
      expect(store).toBeTruthy();
      expect(sendMessage).toBeTruthy();
      expect(client.plugins.includes(TestPlugin.id)).toBe(true);
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
    },
  );
});
