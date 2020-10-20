/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.mock('../../defaultPlugins');
jest.mock('../../utils/loadDynamicPlugins');
import dispatcher, {
  getDynamicPlugins,
  checkDisabled,
  checkGK,
  createRequirePluginFunction,
  filterNewestVersionOfEachPlugin,
} from '../plugins';
import {PluginDetails} from 'flipper-plugin-lib';
import path from 'path';
import {remote} from 'electron';
import {FlipperPlugin} from '../../plugin';
import reducers, {State} from '../../reducers/index';
import {getInstance} from '../../fb-stubs/Logger';
import configureStore from 'redux-mock-store';
import {TEST_PASSING_GK, TEST_FAILING_GK} from '../../fb-stubs/GK';
import TestPlugin from './TestPlugin';
import {resetConfigForTesting} from '../../utils/processConfig';
import {SandyPluginDefinition} from 'flipper-plugin';
import {mocked} from 'ts-jest/utils';
import loadDynamicPlugins from '../../utils/loadDynamicPlugins';

const loadDynamicPluginsMock = mocked(loadDynamicPlugins);

const mockStore = configureStore<State, {}>([])(
  reducers(undefined, {type: 'INIT'}),
);
const logger = getInstance();

const samplePluginDetails: PluginDetails = {
  name: 'other Name',
  entry: './test/index.js',
  version: '1.0.0',
  specVersion: 2,
  main: 'dist/bundle.js',
  dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
  source: 'src/index.js',
  id: 'Sample',
  title: 'Sample',
  isDefault: false,
};

beforeEach(() => {
  resetConfigForTesting();
  loadDynamicPluginsMock.mockResolvedValue([]);
});

afterEach(() => {
  loadDynamicPluginsMock.mockClear();
});

test('dispatcher dispatches REGISTER_PLUGINS', async () => {
  await dispatcher(mockStore, logger);
  const actions = mockStore.getActions();
  expect(actions.map((a) => a.type)).toContain('REGISTER_PLUGINS');
});

test('getDynamicPlugins returns empty array on errors', async () => {
  const loadDynamicPluginsMock = mocked(loadDynamicPlugins);
  loadDynamicPluginsMock.mockRejectedValue(new Error('ooops'));
  const res = await getDynamicPlugins();
  expect(res).toEqual([]);
});

test('checkDisabled', () => {
  const disabledPlugin = 'pluginName';
  const config = {disabledPlugins: [disabledPlugin]};
  remote.process.env.CONFIG = JSON.stringify(config);
  const disabled = checkDisabled([]);

  expect(
    disabled({
      ...samplePluginDetails,
      name: 'other Name',
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeTruthy();

  expect(
    disabled({
      ...samplePluginDetails,
      name: disabledPlugin,
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeFalsy();
});

test('checkGK for plugin without GK', () => {
  expect(
    checkGK([])({
      ...samplePluginDetails,
      name: 'pluginID',
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for passing plugin', () => {
  expect(
    checkGK([])({
      ...samplePluginDetails,
      name: 'pluginID',
      gatekeeper: TEST_PASSING_GK,
      entry: './test/index.js',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for failing plugin', () => {
  const gatekeepedPlugins: PluginDetails[] = [];
  const name = 'pluginID';
  const plugins = checkGK(gatekeepedPlugins)({
    ...samplePluginDetails,
    name,
    gatekeeper: TEST_FAILING_GK,
    entry: './test/index.js',
    version: '1.0.0',
  });

  expect(plugins).toBeFalsy();
  expect(gatekeepedPlugins[0].name).toEqual(name);
});

test('requirePlugin returns null for invalid requires', () => {
  const requireFn = createRequirePluginFunction([], require);
  const plugin = requireFn({
    ...samplePluginDetails,
    name: 'pluginID',
    entry: 'this/path/does not/exist',
    version: '1.0.0',
  });

  expect(plugin).toBeNull();
});

test('requirePlugin loads plugin', () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction([], require);
  const plugin = requireFn({
    ...samplePluginDetails,
    name,
    entry: path.join(__dirname, 'TestPlugin'),
    version: '1.0.0',
  });
  expect(plugin).not.toBeNull();
  expect((plugin as any).prototype).toBeInstanceOf(FlipperPlugin);
  expect(plugin!.id).toBe(TestPlugin.id);
});

test('newest version of each plugin is used', () => {
  const bundledPlugins: PluginDetails[] = [
    {...samplePluginDetails, name: 'flipper-plugin-test1', version: '0.1.0'},
    {
      ...samplePluginDetails,
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.201',
    },
  ];
  const installedPlugins: PluginDetails[] = [
    {
      ...samplePluginDetails,
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.21',
    },
    {...samplePluginDetails, name: 'flipper-plugin-test1', version: '0.10.0'},
  ];
  const filteredPlugins = filterNewestVersionOfEachPlugin(
    bundledPlugins,
    installedPlugins,
  );
  expect(filteredPlugins).toHaveLength(2);
  expect(filteredPlugins).toContainEqual({
    ...samplePluginDetails,
    name: 'flipper-plugin-test1',
    version: '0.10.0',
  });
  expect(filteredPlugins).toContainEqual({
    ...samplePluginDetails,
    name: 'flipper-plugin-test2',
    version: '0.1.0-alpha.201',
  });
});

test('bundled versions are used when env var FLIPPER_DISABLE_PLUGIN_AUTO_UPDATE is set even if newer versions are installed', () => {
  process.env.FLIPPER_DISABLE_PLUGIN_AUTO_UPDATE = 'true';
  try {
    const bundledPlugins: PluginDetails[] = [
      {...samplePluginDetails, name: 'flipper-plugin-test1', version: '0.1.0'},
      {
        ...samplePluginDetails,
        name: 'flipper-plugin-test2',
        version: '0.1.0-alpha.21',
      },
    ];
    const installedPlugins: PluginDetails[] = [
      {
        ...samplePluginDetails,
        name: 'flipper-plugin-test2',
        version: '0.1.0-alpha.201',
      },
      {...samplePluginDetails, name: 'flipper-plugin-test1', version: '0.10.0'},
    ];
    const filteredPlugins = filterNewestVersionOfEachPlugin(
      bundledPlugins,
      installedPlugins,
    );
    expect(filteredPlugins).toHaveLength(2);
    expect(filteredPlugins).toContainEqual({
      ...samplePluginDetails,
      name: 'flipper-plugin-test1',
      version: '0.1.0',
    });
    expect(filteredPlugins).toContainEqual({
      ...samplePluginDetails,
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.21',
    });
  } finally {
    delete process.env.FLIPPER_DISABLE_PLUGIN_AUTO_UPDATE;
  }
});

test('requirePlugin loads valid Sandy plugin', () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction([], require);
  const plugin = requireFn({
    ...samplePluginDetails,
    name,
    entry: path.join(
      __dirname,
      '../../../../flipper-plugin/src/__tests__/TestPlugin',
    ),
    version: '1.0.0',
    flipperSDKVersion: '0.0.0',
  }) as SandyPluginDefinition;
  expect(plugin).not.toBeNull();
  expect(plugin).toBeInstanceOf(SandyPluginDefinition);
  expect(plugin.id).toBe('Sample');
  expect(plugin.details).toMatchObject({
    flipperSDKVersion: '0.0.0',
    id: 'Sample',
    isDefault: false,
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

test('requirePlugin errors on invalid Sandy plugin', () => {
  const name = 'pluginID';
  const failedPlugins: any[] = [];
  const requireFn = createRequirePluginFunction(failedPlugins, require);
  requireFn({
    ...samplePluginDetails,
    name,
    // Intentionally the wrong file:
    entry: path.join(__dirname, 'TestPlugin'),
    version: '1.0.0',
    flipperSDKVersion: '0.0.0',
  });
  expect(failedPlugins[0][1]).toMatchInlineSnapshot(
    `"Flipper plugin 'Sample' should export named function called 'plugin'"`,
  );
});

test('requirePlugin loads valid Sandy Device plugin', () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction([], require);
  const plugin = requireFn({
    ...samplePluginDetails,
    name,
    entry: path.join(
      __dirname,
      '../../../../flipper-plugin/src/__tests__/DeviceTestPlugin',
    ),
    version: '1.0.0',
    flipperSDKVersion: '0.0.0',
  }) as SandyPluginDefinition;
  expect(plugin).not.toBeNull();
  expect(plugin).toBeInstanceOf(SandyPluginDefinition);
  expect(plugin.id).toBe('Sample');
  expect(plugin.details).toMatchObject({
    flipperSDKVersion: '0.0.0',
    id: 'Sample',
    isDefault: false,
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
