/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.mock('../plugins');
jest.mock('../../utils/electronModuleCache');
import {loadPlugin} from '../../reducers/pluginManager';
import {requirePlugin} from '../plugins';
import {mocked} from 'ts-jest/utils';
import {TestUtils} from 'flipper-plugin';
import * as TestPlugin from '../../test-utils/TestPlugin';
import {_SandyPluginDefinition as SandyPluginDefinition} from 'flipper-plugin';
import MockFlipper from '../../test-utils/MockFlipper';

const pluginDetails1 = TestUtils.createMockPluginDetails({
  id: 'plugin1',
  version: '0.0.1',
});
const pluginDefinition1 = new SandyPluginDefinition(pluginDetails1, TestPlugin);

const pluginDetails1V2 = TestUtils.createMockPluginDetails({
  id: 'plugin1',
  version: '0.0.2',
});
const pluginDefinition1V2 = new SandyPluginDefinition(
  pluginDetails1V2,
  TestPlugin,
);

const pluginDetails2 = TestUtils.createMockPluginDetails({id: 'plugin2'});
const pluginDefinition2 = new SandyPluginDefinition(pluginDetails2, TestPlugin);

const mockedRequirePlugin = mocked(requirePlugin);

let mockFlipper: MockFlipper;

beforeEach(async () => {
  mockedRequirePlugin.mockImplementation(
    (details) =>
      (details === pluginDetails1
        ? pluginDefinition1
        : details === pluginDetails2
        ? pluginDefinition2
        : details === pluginDetails1V2
        ? pluginDefinition1V2
        : undefined)!,
  );
  mockFlipper = new MockFlipper();
  await mockFlipper.initWithDeviceAndClient({
    clientOptions: {supportedPlugins: ['plugin1', 'plugin2']},
  });
});

afterEach(async () => {
  mockedRequirePlugin.mockReset();
  await mockFlipper.destroy();
});

test('load plugin when no other version loaded', async () => {
  mockFlipper.dispatch(
    loadPlugin({plugin: pluginDetails1, enable: false, notifyIfFailed: false}),
  );
  expect(mockFlipper.getState().plugins.clientPlugins.get('plugin1')).toBe(
    pluginDefinition1,
  );
  expect(mockFlipper.getState().plugins.loadedPlugins.get('plugin1')).toBe(
    pluginDetails1,
  );
  expect(mockFlipper.clients[0].sandyPluginStates.has('plugin1')).toBeFalsy();
});

test('load plugin when other version loaded', async () => {
  mockFlipper.dispatch(
    loadPlugin({plugin: pluginDetails1, enable: false, notifyIfFailed: false}),
  );
  mockFlipper.dispatch(
    loadPlugin({
      plugin: pluginDetails1V2,
      enable: false,
      notifyIfFailed: false,
    }),
  );
  expect(mockFlipper.getState().plugins.clientPlugins.get('plugin1')).toBe(
    pluginDefinition1V2,
  );
  expect(mockFlipper.getState().plugins.loadedPlugins.get('plugin1')).toBe(
    pluginDetails1V2,
  );
  expect(mockFlipper.clients[0].sandyPluginStates.has('plugin1')).toBeFalsy();
});

test('load and enable Sandy plugin', async () => {
  mockFlipper.dispatch(
    loadPlugin({plugin: pluginDetails1, enable: true, notifyIfFailed: false}),
  );
  expect(mockFlipper.getState().plugins.clientPlugins.get('plugin1')).toBe(
    pluginDefinition1,
  );
  expect(mockFlipper.getState().plugins.loadedPlugins.get('plugin1')).toBe(
    pluginDetails1,
  );
  expect(mockFlipper.clients[0].sandyPluginStates.has('plugin1')).toBeTruthy();
});
