/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  getPersistentPlugins,
  getActivePersistentPlugins,
} from '../pluginUtils.tsx';
import type {State as PluginsState} from '../../reducers/plugins.tsx';
import type {State as PluginStatesState} from '../../reducers/pluginStates.tsx';
import type {PluginDefinition} from '../../dispatcher/plugins.tsx';
import type {State as PluginMessageQueueState} from '../../reducers/pluginStates.tsx';
import {FlipperBasePlugin} from 'flipper';
import type {ReduxState} from '../../reducers/index.tsx';

function createMockFlipperPluginWithDefaultPersistedState(id: string) {
  return class MockFlipperPluginWithDefaultPersistedState extends FlipperBasePlugin<
    *,
    *,
    {msg: string},
  > {
    static id = id;
    static defaultPersistedState = {msg: 'MockFlipperPluginWithPersistedState'};
  };
}

function createMockFlipperPluginWithExportPersistedState(id: string) {
  return class MockFlipperPluginWithExportPersistedState extends FlipperBasePlugin<
    *,
    *,
    {msg: string},
  > {
    static id = id;
    static exportPersistedState = (
      callClient: (string, ?Object) => Promise<Object>,
      persistedState: ?{msg: string},
      store: ?ReduxState,
      supportsMethod?: (string) => Promise<boolean>,
    ): Promise<?{msg: string}> => {
      return Promise.resolve({
        msg: 'MockFlipperPluginWithExportPersistedState',
      });
    };
  };
}

function createMockFlipperPluginWithNoPersistedState(id: string) {
  return class MockFlipperPluginWithNoPersistedState extends FlipperBasePlugin<
    *,
    *,
    *,
  > {
    static id = id;
  };
}

function mockPluginState(
  gatekeepedPlugins: Array<PluginDefinition>,
  disabledPlugins: Array<PluginDefinition>,
  failedPlugins: Array<[PluginDefinition, string]>,
): PluginsState {
  return {
    devicePlugins: new Map([
      [
        'DevicePlugin1',
        createMockFlipperPluginWithDefaultPersistedState('DevicePlugin1'),
      ],
      [
        'DevicePlugin2',
        createMockFlipperPluginWithDefaultPersistedState('DevicePlugin2'),
      ],
    ]),
    clientPlugins: new Map([
      [
        'ClientPlugin1',
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin1'),
      ],
      [
        'ClientPlugin2',
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin2'),
      ],
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
      [
        'DevicePlugin1',
        createMockFlipperPluginWithExportPersistedState('DevicePlugin1'),
      ],
      [
        'DevicePlugin2',
        createMockFlipperPluginWithExportPersistedState('DevicePlugin2'),
      ],
    ]),
    clientPlugins: new Map([
      [
        'ClientPlugin1',
        createMockFlipperPluginWithExportPersistedState('ClientPlugin1'),
      ],
      [
        'ClientPlugin2',
        createMockFlipperPluginWithExportPersistedState('ClientPlugin2'),
      ],
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
      [
        'DevicePlugin1',
        createMockFlipperPluginWithNoPersistedState('DevicePlugin1'),
      ],
      [
        'DevicePlugin2',
        createMockFlipperPluginWithDefaultPersistedState('DevicePlugin2'),
      ],
    ]),
    clientPlugins: new Map([
      [
        'ClientPlugin1',
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin1'),
      ],
      [
        'ClientPlugin2',
        createMockFlipperPluginWithNoPersistedState('ClientPlugin2'),
      ],
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
      [
        'DevicePlugin1',
        createMockFlipperPluginWithNoPersistedState('DevicePlugin1'),
      ],
      [
        'DevicePlugin2',
        createMockFlipperPluginWithDefaultPersistedState('DevicePlugin2'),
      ],
    ]),
    clientPlugins: new Map([
      [
        'ClientPlugin1',
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin1'),
      ],
      [
        'ClientPlugin2',
        createMockFlipperPluginWithNoPersistedState('ClientPlugin2'),
      ],
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
  const queues: PluginMessageQueueState = {};
  const list = getActivePersistentPlugins(plugins, queues, state);
  expect(list).toEqual([
    {
      id: 'ClientPlugin1',
      label: 'ClientPlugin1',
    },
    {
      id: 'DevicePlugin2',
      label: 'DevicePlugin2',
    },
  ]);
});

test('getActivePersistentPlugins, where the plugins not in pluginState or queue gets excluded', () => {
  const state: PluginsState = {
    devicePlugins: new Map([
      [
        'DevicePlugin1',
        createMockFlipperPluginWithDefaultPersistedState('DevicePlugin1'),
      ],
      [
        'DevicePlugin2',
        createMockFlipperPluginWithDefaultPersistedState('DevicePlugin2'),
      ],
    ]),
    clientPlugins: new Map([
      [
        'ClientPlugin1',
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin1'),
      ],
      [
        'ClientPlugin2',
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin2'),
      ],
      [
        'ClientPlugin3',
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin3'),
      ],
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
  const queues: PluginMessageQueueState = {
    'serial#app#ClientPlugin3': [
      {method: 'msg', params: {msg: 'ClientPlugin3'}},
    ],
  };
  const list = getActivePersistentPlugins(plugins, queues, state);
  expect(list).toEqual([
    {
      id: 'ClientPlugin2',
      label: 'ClientPlugin2',
    },
    {
      id: 'ClientPlugin3',
      label: 'ClientPlugin3',
    },
    {
      id: 'DevicePlugin1',
      label: 'DevicePlugin1',
    },
  ]);
});
