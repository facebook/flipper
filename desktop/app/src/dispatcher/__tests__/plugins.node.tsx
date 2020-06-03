/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.mock('../../defaultPlugins');

import dispatcher, {
  PluginDefinition,
  getDynamicPlugins,
  checkDisabled,
  checkGK,
  requirePlugin,
  filterNewestVersionOfEachPlugin,
} from '../plugins';
import path from 'path';
import {ipcRenderer, remote} from 'electron';
import {FlipperPlugin} from 'flipper';
import reducers, {State} from '../../reducers/index';
import {init as initLogger} from '../../fb-stubs/Logger';
import configureStore from 'redux-mock-store';
import {TEST_PASSING_GK, TEST_FAILING_GK} from '../../fb-stubs/GK';
import TestPlugin from './TestPlugin';
import {resetConfigForTesting} from '../../utils/processConfig';

const mockStore = configureStore<State, {}>([])(
  reducers(undefined, {type: 'INIT'}),
);
const logger = initLogger(mockStore);

beforeEach(() => {
  resetConfigForTesting();
});

test('dispatcher dispatches REGISTER_PLUGINS', () => {
  dispatcher(mockStore, logger);
  const actions = mockStore.getActions();
  expect(actions.map((a) => a.type)).toContain('REGISTER_PLUGINS');
});

test('getDynamicPlugins returns empty array on errors', () => {
  const sendSyncMock = jest.fn();
  sendSyncMock.mockImplementation(() => {
    throw new Error('ooops');
  });
  ipcRenderer.sendSync = sendSyncMock;
  const res = getDynamicPlugins();
  expect(res).toEqual([]);
});

test('getDynamicPlugins from main process via ipc', () => {
  const plugins = [{name: 'test'}];
  const sendSyncMock = jest.fn();
  sendSyncMock.mockReturnValue(plugins);
  ipcRenderer.sendSync = sendSyncMock;
  const res = getDynamicPlugins();
  expect(res).toEqual(plugins);
});

test('checkDisabled', () => {
  const disabledPlugin = 'pluginName';
  const config = {disabledPlugins: [disabledPlugin]};
  remote.process.env.CONFIG = JSON.stringify(config);
  const disabled = checkDisabled([]);

  expect(
    disabled({
      name: 'other Name',
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeTruthy();

  expect(
    disabled({
      name: disabledPlugin,
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeFalsy();
});

test('checkGK for plugin without GK', () => {
  expect(
    checkGK([])({
      name: 'pluginID',
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for passing plugin', () => {
  expect(
    checkGK([])({
      name: 'pluginID',
      gatekeeper: TEST_PASSING_GK,
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for failing plugin', () => {
  const gatekeepedPlugins: PluginDefinition[] = [];
  const name = 'pluginID';
  const plugins = checkGK(gatekeepedPlugins)({
    name,
    gatekeeper: TEST_FAILING_GK,
    entry: './test/index.js',
    version: '1.0.0',
  });

  expect(plugins).toBeFalsy();
  expect(gatekeepedPlugins[0].name).toEqual(name);
});

test('requirePlugin returns null for invalid requires', () => {
  const requireFn = requirePlugin([], {}, require);
  const plugin = requireFn({
    name: 'pluginID',
    entry: 'this/path/does not/exist',
    version: '1.0.0',
  });

  expect(plugin).toBeNull();
});

test('requirePlugin loads plugin', () => {
  const name = 'pluginID';
  const requireFn = requirePlugin([], {}, require);
  const plugin = requireFn({
    name,
    entry: path.join(__dirname, 'TestPlugin'),
    version: '1.0.0',
  });
  expect(plugin!.prototype).toBeInstanceOf(FlipperPlugin);
  expect(plugin!.id).toBe(TestPlugin.id);
});

test('newest version of each plugin is taken', () => {
  const plugins: PluginDefinition[] = [
    {name: 'flipper-plugin-test1', version: '0.1.0'},
    {name: 'flipper-plugin-test2', version: '0.1.0-alpha.201'},
    {name: 'flipper-plugin-test2', version: '0.1.0-alpha.21'},
    {name: 'flipper-plugin-test1', version: '0.10.0'},
  ];
  const filteredPlugins = filterNewestVersionOfEachPlugin(plugins);
  expect(filteredPlugins).toHaveLength(2);
  expect(filteredPlugins).toContainEqual({
    name: 'flipper-plugin-test1',
    version: '0.10.0',
  });
  expect(filteredPlugins).toContainEqual({
    name: 'flipper-plugin-test2',
    version: '0.1.0-alpha.201',
  });
});
