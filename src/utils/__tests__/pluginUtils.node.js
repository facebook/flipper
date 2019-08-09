/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {getPersistentPlugins, getActivePersistentPlugins} from '../pluginUtils';
import type {State as PluginsState} from '../../reducers/plugins.tsx';
import type {State as PluginStatesState} from '../../reducers/pluginStates.tsx';
import type {PluginDefinition} from '../../dispatcher/plugins.tsx';
import {FlipperBasePlugin} from '../../..';
import type {MiddlewareAPI} from '../../reducers/index.tsx';
class MockFlipperPluginWithDefaultPersistedState extends FlipperBasePlugin<
  *,
  *,
  {msg: string},
> {
  static defaultPersistedState = {msg: 'MockFlipperPluginWithPersistedState'};
}

class MockFlipperPluginWithExportPersistedState extends FlipperBasePlugin<
  *,
  *,
  {msg: string},
> {
  static exportPersistedState = (
    callClient: (string, ?Object) => Promise<Object>,
    persistedState: ?{msg: string},
    store: ?MiddlewareAPI,
  ): Promise<?{msg: string}> => {
    return Promise.resolve({msg: 'MockFlipperPluginWithExportPersistedState'});
  };
}

class MockFlipperPluginWithNoPersistedState extends FlipperBasePlugin<
  *,
  *,
  *,
> {}

function mockPluginState(
  gatekeepedPlugins: Array<PluginDefinition>,
  disabledPlugins: Array<PluginDefinition>,
  failedPlugins: Array<[PluginDefinition, string]>,
): PluginsState {
  return {
    devicePlugins: new Map([
      ['DevicePlugin1', MockFlipperPluginWithDefaultPersistedState],
      ['DevicePlugin2', MockFlipperPluginWithDefaultPersistedState],
    ]),
    clientPlugins: new Map([
      ['ClientPlugin1', MockFlipperPluginWithDefaultPersistedState],
      ['ClientPlugin2', MockFlipperPluginWithDefaultPersistedState],
    ]),
    gatekeepedPlugins,
    disabledPlugins,
    failedPlugins,
    selectedPlugins: [],
  };
}

function mockPluginDefinition(name: string): PluginDefinition {
  return {
    name,
    out: 'out',
  };
}

test('getPersistentPlugins with the plugins getting excluded', () => {
  const state = mockPluginState(
    [mockPluginDefinition('DevicePlugin1')],
    [mockPluginDefinition('ClientPlugin1')],
    [[mockPluginDefinition('DevicePlugin2'), 'DevicePlugin2']],
  );
  const list = getPersistentPlugins(state);
  expect(list).toEqual(['ClientPlugin2']);
});

test('getPersistentPlugins with no plugins getting excluded', () => {
  const state = mockPluginState([], [], []);
  const list = getPersistentPlugins(state);
  expect(list).toEqual([
    'ClientPlugin1',
    'ClientPlugin2',
    'DevicePlugin1',
    'DevicePlugin2',
  ]);
});

test('getPersistentPlugins, where the plugins with exportPersistedState not getting excluded', () => {
  const state: PluginsState = {
    devicePlugins: new Map([
      ['DevicePlugin1', MockFlipperPluginWithExportPersistedState],
      ['DevicePlugin2', MockFlipperPluginWithExportPersistedState],
    ]),
    clientPlugins: new Map([
      ['ClientPlugin1', MockFlipperPluginWithExportPersistedState],
      ['ClientPlugin2', MockFlipperPluginWithExportPersistedState],
    ]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: [],
  };
  const list = getPersistentPlugins(state);
  expect(list).toEqual([
    'ClientPlugin1',
    'ClientPlugin2',
    'DevicePlugin1',
    'DevicePlugin2',
  ]);
});

test('getPersistentPlugins, where the non persistent plugins getting excluded', () => {
  const state: PluginsState = {
    devicePlugins: new Map([
      ['DevicePlugin1', MockFlipperPluginWithNoPersistedState],
      ['DevicePlugin2', MockFlipperPluginWithDefaultPersistedState],
    ]),
    clientPlugins: new Map([
      ['ClientPlugin1', MockFlipperPluginWithDefaultPersistedState],
      ['ClientPlugin2', MockFlipperPluginWithNoPersistedState],
    ]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: [],
  };
  const list = getPersistentPlugins(state);
  expect(list).toEqual(['ClientPlugin1', 'DevicePlugin2']);
});

test('getActivePersistentPlugins, where the non persistent plugins getting excluded', () => {
  const state: PluginsState = {
    devicePlugins: new Map([
      ['DevicePlugin1', MockFlipperPluginWithNoPersistedState],
      ['DevicePlugin2', MockFlipperPluginWithDefaultPersistedState],
    ]),
    clientPlugins: new Map([
      ['ClientPlugin1', MockFlipperPluginWithDefaultPersistedState],
      ['ClientPlugin2', MockFlipperPluginWithNoPersistedState],
    ]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: [],
  };
  const plugins: PluginStatesState = {
    'serial#app#DevicePlugin1': {msg: 'DevicePlugin1'},
    'serial#app#DevicePlugin2': {msg: 'DevicePlugin2'},
    'serial#app#ClientPlugin1': {msg: 'ClientPlugin1'},
    'serial#app#ClientPlugin2': {msg: 'ClientPlugin2'},
  };
  const list = getActivePersistentPlugins(plugins, state);
  expect(list).toEqual(['ClientPlugin1', 'DevicePlugin2']);
});

test('getActivePersistentPlugins, where the plugins not in pluginState gets excluded', () => {
  const state: PluginsState = {
    devicePlugins: new Map([
      ['DevicePlugin1', MockFlipperPluginWithDefaultPersistedState],
      ['DevicePlugin2', MockFlipperPluginWithDefaultPersistedState],
    ]),
    clientPlugins: new Map([
      ['ClientPlugin1', MockFlipperPluginWithDefaultPersistedState],
      ['ClientPlugin2', MockFlipperPluginWithDefaultPersistedState],
    ]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: [],
  };
  const plugins: PluginStatesState = {
    'serial#app#DevicePlugin1': {msg: 'DevicePlugin1'},
    'serial#app#ClientPlugin2': {msg: 'ClientPlugin2'},
  };
  const list = getActivePersistentPlugins(plugins, state);
  expect(list).toEqual(['ClientPlugin2', 'DevicePlugin1']);
});
