/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import dispatcher, {requirePluginInternal} from '../plugins';
import {InstalledPluginDetails} from 'flipper-common';
import {createRootReducer, State} from '../../reducers/index';
import {getLogger} from 'flipper-common';
import configureStore from 'redux-mock-store';
import TestPlugin from './TestPlugin';
import {_SandyPluginDefinition} from 'flipper-plugin';
import path from 'path';
import {createRequirePluginFunction} from '../../plugins';
import {getRenderHostInstance} from '../../RenderHost';

let loadDynamicPluginsMock: jest.Mock;

const mockStore = configureStore<State, {}>([])(
  createRootReducer()(undefined, {type: 'INIT'}),
);
const logger = getLogger();

const sampleInstalledPluginDetails: InstalledPluginDetails = {
  name: 'other Name',
  version: '1.0.0',
  specVersion: 2,
  pluginType: 'client',
  main: 'dist/bundle.js',
  source: 'src/index.js',
  id: 'Sample',
  title: 'Sample',
  dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
  entry: 'this/path/does not/exist',
  isActivatable: true,
};

beforeEach(() => {
  loadDynamicPluginsMock = getRenderHostInstance().flipperServer.exec =
    jest.fn();
  loadDynamicPluginsMock.mockResolvedValue([]);
});

test('dispatcher dispatches REGISTER_PLUGINS', async () => {
  await dispatcher(mockStore, logger);
  const actions = mockStore.getActions();
  expect(actions.map((a) => a.type)).toContain('REGISTER_PLUGINS');
});

test('requirePluginInternal returns null for invalid requires', async () => {
  const requireFn = createRequirePluginFunction(requirePluginInternal)([]);
  const plugin = await requireFn({
    ...sampleInstalledPluginDetails,
    name: 'pluginID',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
    entry: 'this/path/does not/exist',
    version: '1.0.0',
  });

  expect(plugin).toBeNull();
});

test('requirePluginInternal loads plugin', async () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction(requirePluginInternal)([]);
  const plugin = await requireFn({
    ...sampleInstalledPluginDetails,
    name,
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
    entry: path.join(__dirname, 'TestPlugin'),
    version: '1.0.0',
  });
  expect(plugin).not.toBeNull();
  expect(Object.keys(plugin as any)).toEqual([
    'id',
    'css',
    'details',
    'isDevicePlugin',
    'module',
  ]);
  expect(Object.keys((plugin as any).module)).toEqual(['plugin', 'Component']);

  expect(plugin!.id).toBe(TestPlugin.id);
});

test('requirePluginInternal loads valid Sandy plugin', async () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction(requirePluginInternal)([]);
  const plugin = (await requireFn({
    ...sampleInstalledPluginDetails,
    name,
    dir: path.join(
      __dirname,
      '../../../../flipper-plugin/src/__tests__/TestPlugin',
    ),
    entry: path.join(
      __dirname,
      '../../../../flipper-plugin/src/__tests__/TestPlugin',
    ),
    version: '1.0.0',
    flipperSDKVersion: '0.0.0',
  })) as _SandyPluginDefinition;
  expect(plugin).not.toBeNull();
  expect(plugin).toBeInstanceOf(_SandyPluginDefinition);
  expect(plugin.id).toBe('Sample');
  expect(plugin.details).toMatchObject({
    flipperSDKVersion: '0.0.0',
    id: 'Sample',
    main: 'dist/bundle.js',
    name: 'pluginID',
    source: 'src/index.js',
    specVersion: 2,
    title: 'Sample',
    version: '1.0.0',
  });
  expect(plugin.isDevicePlugin).toBe(false);
  expect(typeof plugin.module.Component).toBe('function');
  expect(plugin.module.Component.displayName).toBe('FlipperPlugin(Sample)');
  expect(typeof plugin.asPluginModule().plugin).toBe('function');
});

test('requirePluginInternal errors on invalid Sandy plugin', async () => {
  const name = 'pluginID';
  const failedPlugins: any[] = [];
  const requireFn = createRequirePluginFunction(requirePluginInternal)(
    failedPlugins,
  );
  await requireFn({
    ...sampleInstalledPluginDetails,
    name,
    // Intentionally the wrong file:
    dir: __dirname,
    entry: path.join(__dirname, 'TestPlugin'),
    version: '1.0.0',
    flipperSDKVersion: '0.0.0',
  });
  expect(failedPlugins[0][1]).toMatchInlineSnapshot(
    `"Flipper plugin 'Sample' should export named function called 'plugin'"`,
  );
});

test('requirePluginInternal loads valid Sandy Device plugin', async () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction(requirePluginInternal)([]);
  const plugin = (await requireFn({
    ...sampleInstalledPluginDetails,
    pluginType: 'device',
    name,
    dir: path.join(
      __dirname,
      '../../../../flipper-plugin/src/__tests__/DeviceTestPlugin',
    ),
    entry: path.join(
      __dirname,
      '../../../../flipper-plugin/src/__tests__/DeviceTestPlugin',
    ),
    version: '1.0.0',
    flipperSDKVersion: '0.0.0',
  })) as _SandyPluginDefinition;
  expect(plugin).not.toBeNull();
  expect(plugin).toBeInstanceOf(_SandyPluginDefinition);
  expect(plugin.id).toBe('Sample');
  expect(plugin.details).toMatchObject({
    flipperSDKVersion: '0.0.0',
    id: 'Sample',
    main: 'dist/bundle.js',
    name: 'pluginID',
    source: 'src/index.js',
    specVersion: 2,
    title: 'Sample',
    version: '1.0.0',
  });
  expect(plugin.isDevicePlugin).toBe(true);
  expect(typeof plugin.module.Component).toBe('function');
  expect(plugin.module.Component.displayName).toBe('FlipperPlugin(Sample)');
  expect(typeof plugin.asDevicePluginModule().devicePlugin).toBe('function');
  expect(typeof plugin.asDevicePluginModule().supportsDevice).toBe('function');
});
