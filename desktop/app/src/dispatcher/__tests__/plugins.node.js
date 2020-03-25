/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import dispatcher, {
  getDynamicPlugins,
  checkDisabled,
  checkGK,
  requirePlugin,
} from '../plugins.tsx';
import path from 'path';
import {ipcRenderer, remote} from 'electron';
import {FlipperPlugin} from 'flipper';
import reducers from '../../reducers/index.tsx';
import {init as initLogger} from '../../fb-stubs/Logger.tsx';
import configureStore from 'redux-mock-store';
import {TEST_PASSING_GK, TEST_FAILING_GK} from '../../fb-stubs/GK.tsx';
import TestPlugin from './TestPlugin';
import {resetConfigForTesting} from '../../utils/processConfig.tsx';

const mockStore = configureStore([])(reducers(undefined, {type: 'INIT'}));
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
  ipcRenderer.sendSync = jest.fn();
  ipcRenderer.sendSync.mockImplementation(() => {
    throw new Error('ooops');
  });
  const res = getDynamicPlugins();
  expect(res).toEqual([]);
});

test('getDynamicPlugins from main process via ipc', () => {
  const plugins = [{name: 'test'}];
  ipcRenderer.sendSync = jest.fn();
  ipcRenderer.sendSync.mockReturnValue(plugins);
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
      out: './test/index.js',
    }),
  ).toBeTruthy();

  expect(
    disabled({
      name: disabledPlugin,
      out: './test/index.js',
    }),
  ).toBeFalsy();
});

test('checkGK for plugin without GK', () => {
  expect(
    checkGK([])({
      name: 'pluginID',
      out: './test/index.js',
    }),
  ).toBeTruthy();
});

test('checkGK for passing plugin', () => {
  expect(
    checkGK([])({
      name: 'pluginID',
      gatekeeper: TEST_PASSING_GK,
      out: './test/index.js',
    }),
  ).toBeTruthy();
});

test('checkGK for failing plugin', () => {
  const gatekeepedPlugins = [];
  const name = 'pluginID';
  const plugins = checkGK(gatekeepedPlugins)({
    name,
    gatekeeper: TEST_FAILING_GK,
    out: './test/index.js',
  });

  expect(plugins).toBeFalsy();
  expect(gatekeepedPlugins[0].name).toEqual(name);
});

test('requirePlugin returns null for invalid requires', () => {
  const requireFn = requirePlugin([], require);
  const plugin = requireFn({
    name: 'pluginID',
    out: 'this/path/does not/exist',
  });

  expect(plugin).toBeNull();
});

test('requirePlugin loads plugin', () => {
  const name = 'pluginID';
  const homepage = 'https://fb.workplace.com/groups/flippersupport/';
  const requireFn = requirePlugin([], require);
  const plugin = requireFn({
    name,
    homepage,
    out: path.join(__dirname, 'TestPlugin.js'),
  });
  expect(plugin.prototype).toBeInstanceOf(FlipperPlugin);
  expect(plugin.homepage).toBe(homepage);
  expect(plugin.id).toBe(TestPlugin.id);
});
