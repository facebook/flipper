/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as reducer, setPluginState, Action} from '../pluginStates';

test('reduce setPluginState', () => {
  const result = reducer(
    {},
    setPluginState({pluginKey: 'myPlugin', state: {a: 1}}),
  );
  expect(result).toEqual({myPlugin: {a: 1}});
});

test('CLEAR_CLIENT_PLUGINS_STATE removes plugin state', () => {
  const clientId = 'app1#device1';
  const pluginKey = 'app1#device1#plugin1';

  const action: Action = {
    type: 'CLEAR_CLIENT_PLUGINS_STATE',
    payload: {clientId: clientId, devicePlugins: new Set()},
  };
  const result = reducer(
    {[pluginKey]: {a: 1}, 'anotherPlugin#key': {b: 2}},
    action,
  );
  expect(result).toEqual({'anotherPlugin#key': {b: 2}});
});
