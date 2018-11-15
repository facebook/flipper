/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import dispatcher, {
  getDynamicPlugins,
  checkDisabled,
  checkGK,
  requirePlugin,
} from '../plugins';
import path from 'path';
import {remote} from 'electron';
import {FlipperPlugin} from '../../plugin';
import reducers from '../../reducers/index.js';
import Logger from '../../fb-stubs/Logger.js';
import configureStore from 'redux-mock-store';
import {TEST_PASSING_GK, TEST_FAILING_GK} from '../../fb-stubs/GK';

const mockStore = configureStore([])(reducers(undefined, {type: 'INIT'}));
const logger = new Logger();

test('dispatcher dispatches REGISTER_PLUGINS', () => {
  dispatcher(mockStore, logger);
  const actions = mockStore.getActions();
  expect(actions[0].type).toBe('REGISTER_PLUGINS');
});

test('getDynamicPlugins returns empty array', () => {
  // $FlowFixMe process.env not defined in electron API spec
  remote.process.env.PLUGINS = null;
  const res = getDynamicPlugins();
  expect(res).toEqual([]);
});

test('getDynamicPlugins returns empty array for invalid JSON', () => {
  // $FlowFixMe process.env not defined in electron API spec
  remote.process.env.PLUGINS = 'invalid JOSN }}[]';
  const res = getDynamicPlugins();
  expect(res).toEqual([]);
});

test('getDynamicPlugins from env', () => {
  const plugins = [{name: 'test'}];
  // $FlowFixMe process.env not defined in electron API spec
  remote.process.env.PLUGINS = JSON.stringify(plugins);
  const res = getDynamicPlugins();
  expect(res).toEqual(plugins);
});

test('checkDisabled', () => {
  const disabledPlugin = 'pluginName';
  const config = {disabledPlugins: [disabledPlugin]};
  // $FlowFixMe process.env not defined in electron API spec
  remote.process.env.CONFIG = JSON.stringify(config);
  const disabled = checkDisabled();

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
    checkGK({
      name: 'pluginID',
      out: './test/index.js',
    }),
  ).toBeTruthy();
});

test('checkGK for passing plugin', () => {
  expect(
    checkGK({
      name: 'pluginID',
      gatekeeper: TEST_PASSING_GK,
      out: './test/index.js',
    }),
  ).toBeTruthy();
});

test('checkGK for failing plugin', () => {
  expect(
    checkGK({
      name: 'pluginID',
      gatekeeper: TEST_FAILING_GK,
      out: './test/index.js',
    }),
  ).toBeFalsy();
});

test('requirePlugin returns null for invalid requires', () => {
  const plugin = requirePlugin(require)({
    name: 'pluginID',
    out: 'this/path/does not/exist',
  });

  expect(plugin).toBeNull();
});

test('requirePlugin loads plugin', () => {
  const plugin = requirePlugin(require)({
    name: 'pluginID',
    out: path.join(__dirname, 'TestPlugin.js'),
    // $FlowFixMe Electron require returns default exports wrapped in an object
  }).default;

  expect(plugin.prototype).toBeInstanceOf(FlipperPlugin);
});
