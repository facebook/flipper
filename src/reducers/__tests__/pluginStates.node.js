/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {default as reducer, setPluginState} from '../pluginStates';

test('reduce setPluginState', () => {
  const res = reducer(
    {},
    setPluginState({pluginKey: 'myPlugin', state: {a: 1}}),
  );
  expect(res).toEqual({myPlugin: {a: 1}});
});
