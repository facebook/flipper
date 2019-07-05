/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {getActivePluginNames} from '../pluginUtils';
import type {State as PluginsState} from '../../reducers/plugins.js';
import type {PluginDefinition} from '../../dispatcher/plugins';

function mockPluginState(
  gatekeepedPlugins: Array<PluginDefinition>,
  disabledPlugins: Array<PluginDefinition>,
  failedPlugins: Array<[PluginDefinition, string]>,
): PluginsState {
  return {
    devicePlugins: new Map([
      //$FlowFixMe: Class instance won't be used in the test
      ['DevicePlugin1', undefined],
      //$FlowFixMe: Class instance won't be used in the test
      ['DevicePlugin2', undefined],
    ]),
    clientPlugins: new Map([
      //$FlowFixMe: Class instance won't be used in the test
      ['ClientPlugin1', undefined],
      //$FlowFixMe: Class instance won't be used in the test
      ['ClientPlugin2', undefined],
    ]),
    gatekeepedPlugins,
    disabledPlugins,
    failedPlugins,
  };
}

function mockPluginDefinition(name: string): PluginDefinition {
  return {
    name,
    out: 'out',
  };
}

test('getActivePluginNames with the plugins getting excluded', () => {
  let state = mockPluginState(
    [mockPluginDefinition('DevicePlugin1')],
    [mockPluginDefinition('ClientPlugin1')],
    [[mockPluginDefinition('DevicePlugin2'), 'DevicePlugin2']],
  );
  let list = getActivePluginNames(state);
  expect(list).toEqual(['ClientPlugin2']);
});

test('getActivePluginNames with the no plugins getting excluded', () => {
  let state = mockPluginState([], [], []);
  let list = getActivePluginNames(state);
  expect(list).toEqual([
    'ClientPlugin1',
    'ClientPlugin2',
    'DevicePlugin1',
    'DevicePlugin2',
  ]);
});
