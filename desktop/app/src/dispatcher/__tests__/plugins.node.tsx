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
import {BundledPluginDetails, InstalledPluginDetails} from 'flipper-plugin-lib';
import path from 'path';
import {remote} from 'electron';
import {FlipperPlugin} from '../../plugin';
import reducers, {State} from '../../reducers/index';
import {getInstance} from '../../fb-stubs/Logger';
import configureStore from 'redux-mock-store';
import {TEST_PASSING_GK, TEST_FAILING_GK} from '../../fb-stubs/GK';
import TestPlugin from './TestPlugin';
import {resetConfigForTesting} from '../../utils/processConfig';
import {_SandyPluginDefinition} from 'flipper-plugin';
import {mocked} from 'ts-jest/utils';
import loadDynamicPlugins from '../../utils/loadDynamicPlugins';

const loadDynamicPluginsMock = mocked(loadDynamicPlugins);

const mockStore = configureStore<State, {}>([])(
  reducers(undefined, {type: 'INIT'}),
);
const logger = getInstance();

const sampleInstalledPluginDetails: InstalledPluginDetails = {
  name: 'other Name',
  version: '1.0.0',
  specVersion: 2,
  main: 'dist/bundle.js',
  source: 'src/index.js',
  id: 'Sample',
  title: 'Sample',
  dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
  entry: 'this/path/does not/exist',
  isBundled: false,
  isActivatable: true,
};

const sampleBundledPluginDetails: BundledPluginDetails = {
  ...sampleInstalledPluginDetails,
  isBundled: true,
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
      ...sampleBundledPluginDetails,
      name: 'other Name',
      version: '1.0.0',
    }),
  ).toBeTruthy();

  expect(
    disabled({
      ...sampleBundledPluginDetails,
      name: disabledPlugin,
      version: '1.0.0',
    }),
  ).toBeFalsy();
});

test('checkGK for plugin without GK', () => {
  expect(
    checkGK([])({
      ...sampleBundledPluginDetails,
      name: 'pluginID',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for passing plugin', () => {
  expect(
    checkGK([])({
      ...sampleBundledPluginDetails,
      name: 'pluginID',
      gatekeeper: TEST_PASSING_GK,
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for failing plugin', () => {
  const gatekeepedPlugins: InstalledPluginDetails[] = [];
  const name = 'pluginID';
  const plugins = checkGK(gatekeepedPlugins)({
    ...sampleBundledPluginDetails,
    name,
    gatekeeper: TEST_FAILING_GK,
    version: '1.0.0',
  });

  expect(plugins).toBeFalsy();
  expect(gatekeepedPlugins[0].name).toEqual(name);
});

test('requirePlugin returns null for invalid requires', () => {
  const requireFn = createRequirePluginFunction([], require);
  const plugin = requireFn({
    ...sampleInstalledPluginDetails,
    name: 'pluginID',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
    entry: 'this/path/does not/exist',
    version: '1.0.0',
  });

  expect(plugin).toBeNull();
});

test('requirePlugin loads plugin', () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction([], require);
  const plugin = requireFn({
    ...sampleInstalledPluginDetails,
    name,
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
    entry: path.join(__dirname, 'TestPlugin'),
    version: '1.0.0',
  });
  expect(plugin).not.toBeNull();
  expect((plugin as any).prototype).toBeInstanceOf(FlipperPlugin);
  expect(plugin!.id).toBe(TestPlugin.id);
});

test('newest version of each plugin is used', () => {
  const bundledPlugins: BundledPluginDetails[] = [
    {
      ...sampleBundledPluginDetails,
      name: 'flipper-plugin-test1',
      version: '0.1.0',
    },
    {
      ...sampleBundledPluginDetails,
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.201',
    },
  ];
  const installedPlugins: InstalledPluginDetails[] = [
    {
      ...sampleInstalledPluginDetails,
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.21',
      dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test2',
      entry: './test/index.js',
    },
    {
      ...sampleInstalledPluginDetails,
      name: 'flipper-plugin-test1',
      version: '0.10.0',
      dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test1',
      entry: './test/index.js',
    },
  ];
  const filteredPlugins = filterNewestVersionOfEachPlugin(
    bundledPlugins,
    installedPlugins,
  );
  expect(filteredPlugins).toHaveLength(2);
  expect(filteredPlugins).toContainEqual({
    ...sampleInstalledPluginDetails,
    name: 'flipper-plugin-test1',
    version: '0.10.0',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test1',
    entry: './test/index.js',
  });
  expect(filteredPlugins).toContainEqual({
    ...sampleBundledPluginDetails,
    name: 'flipper-plugin-test2',
    version: '0.1.0-alpha.201',
  });
});

test('bundled versions are used when env var FLIPPER_DISABLE_PLUGIN_AUTO_UPDATE is set even if newer versions are installed', () => {
  process.env.FLIPPER_DISABLE_PLUGIN_AUTO_UPDATE = 'true';
  try {
    const bundledPlugins: BundledPluginDetails[] = [
      {
        ...sampleBundledPluginDetails,
        name: 'flipper-plugin-test1',
        version: '0.1.0',
      },
      {
        ...sampleBundledPluginDetails,
        name: 'flipper-plugin-test2',
        version: '0.1.0-alpha.21',
      },
    ];
    const installedPlugins: InstalledPluginDetails[] = [
      {
        ...sampleInstalledPluginDetails,
        name: 'flipper-plugin-test2',
        version: '0.1.0-alpha.201',
        dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test2',
        entry: './test/index.js',
      },
      {
        ...sampleInstalledPluginDetails,
        name: 'flipper-plugin-test1',
        version: '0.10.0',
        dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test1',
        entry: './test/index.js',
      },
    ];
    const filteredPlugins = filterNewestVersionOfEachPlugin(
      bundledPlugins,
      installedPlugins,
    );
    expect(filteredPlugins).toHaveLength(2);
    expect(filteredPlugins).toContainEqual({
      ...sampleBundledPluginDetails,
      name: 'flipper-plugin-test1',
      version: '0.1.0',
    });
    expect(filteredPlugins).toContainEqual({
      ...sampleBundledPluginDetails,
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
  }) as _SandyPluginDefinition;
  expect(plugin).not.toBeNull();
  expect(plugin).toBeInstanceOf(_SandyPluginDefinition);
  expect(plugin.id).toBe('Sample');
  expect(plugin.details).toMatchObject({
    flipperSDKVersion: '0.0.0',
    id: 'Sample',
    isBundled: false,
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

test('requirePlugin loads valid Sandy Device plugin', () => {
  const name = 'pluginID';
  const requireFn = createRequirePluginFunction([], require);
  const plugin = requireFn({
    ...sampleInstalledPluginDetails,
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
  }) as _SandyPluginDefinition;
  expect(plugin).not.toBeNull();
  expect(plugin).toBeInstanceOf(_SandyPluginDefinition);
  expect(plugin.id).toBe('Sample');
  expect(plugin.details).toMatchObject({
    flipperSDKVersion: '0.0.0',
    id: 'Sample',
    isBundled: false,
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
