/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getPluginKey} from '../pluginUtils';
import {FlipperPlugin, FlipperDevicePlugin} from '../../plugin';
import {createMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {getExportablePlugins} from '../../selectors/connections';

function createMockFlipperPluginWithDefaultPersistedState(id: string) {
  return class MockFlipperPluginWithDefaultPersistedState extends FlipperPlugin<
    any,
    any,
    any
  > {
    static id = id;
    static defaultPersistedState = {msg: 'MockFlipperPluginWithPersistedState'};
    ['constructor']: any;

    subscriptions = null as any;
    client = null as any;
    realClient = null as any;
    getDevice = null as any;
  };
}

function createMockDeviceFlipperPlugin(id: string) {
  return class MockFlipperDevicePlugin extends FlipperDevicePlugin<
    any,
    any,
    any
  > {
    static id = id;
    ['constructor']: any;

    static supportsDevice() {
      return true;
    }
  };
}

function createMockFlipperPluginWithExportPersistedState(id: string) {
  return class MockFlipperPluginWithExportPersistedState extends FlipperPlugin<
    any,
    any,
    any
  > {
    static id = id;
    static exportPersistedState = (): Promise<any> => {
      return Promise.resolve({
        msg: 'MockFlipperPluginWithExportPersistedState',
      });
    };
    ['constructor']: any;
  };
}

function createMockFlipperPluginWithNoPersistedState(id: string) {
  return class MockFlipperPluginWithNoPersistedState extends FlipperPlugin<
    any,
    any,
    any
  > {
    static id = id;
    ['constructor']: any;
  };
}

test('getActivePersistentPlugins, where the non persistent plugins getting excluded', async () => {
  const {store, device, client} = await createMockFlipperWithPlugin(
    createMockFlipperPluginWithDefaultPersistedState('ClientPlugin1'),
    {
      additionalPlugins: [
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin2'),
        createMockFlipperPluginWithNoPersistedState('ClientPlugin3'),
        createMockFlipperPluginWithNoPersistedState('ClientPlugin4'),
        createMockFlipperPluginWithExportPersistedState('ClientPlugin5'),
      ],
    },
  );
  const state = store.getState();

  state.pluginStates = {
    [getPluginKey(client.id, device, 'ClientPlugin1')]: {msg: 'DevicePlugin1'},
    [getPluginKey(client.id, device, 'ClientPlugin4')]: {msg: 'ClientPlugin2'},
  };

  const list = getExportablePlugins(state);
  expect(list).toEqual([
    {
      id: 'ClientPlugin1',
      label: 'ClientPlugin1',
    },
    {
      id: 'ClientPlugin4',
      label: 'ClientPlugin4',
    },
    // {  Never activated, and no data received
    //   id: 'ClientPlugin5',
    //   label: 'ClientPlugin5',
    // },
  ]);
});

test('getActivePersistentPlugins, where the plugins not in pluginState or queue gets excluded', async () => {
  const {store, device, client} = await createMockFlipperWithPlugin(
    createMockFlipperPluginWithDefaultPersistedState('Plugin1'),
    {
      additionalPlugins: [
        createMockDeviceFlipperPlugin('DevicePlugin2'),
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin1'),
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin2'),
        createMockFlipperPluginWithDefaultPersistedState('ClientPlugin3'),
      ],
    },
  );

  const state = store.getState();

  state.pluginStates = {
    [getPluginKey(client.id, device, 'ClientPlugin2')]: {msg: 'ClientPlugin2'},
  };
  state.pluginMessageQueue = {
    [getPluginKey(client.id, device, 'ClientPlugin3')]: [
      {method: 'msg', params: {msg: 'ClientPlugin3'}},
    ],
  };

  const list = getExportablePlugins(store.getState());
  expect(list).toEqual([
    {
      id: 'ClientPlugin2', // has state
      label: 'ClientPlugin2',
    },
    {
      id: 'ClientPlugin3', // queued
      label: 'ClientPlugin3',
    },
    {
      // in Sandy wrapper, a plugin is either persistable or not, but it doesn't depend on the current state.
      // So this plugin will show up, even though its state is still the default
      id: 'Plugin1',
      label: 'Plugin1',
    },
  ]);
});
