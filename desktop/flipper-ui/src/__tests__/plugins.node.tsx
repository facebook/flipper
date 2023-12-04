/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  getDynamicPlugins,
  checkDisabled,
  checkGK,
  createRequirePluginFunction,
  getLatestCompatibleVersionOfEachPlugin,
} from '../plugins';
import {InstalledPluginDetails} from 'flipper-common';
import {_SandyPluginDefinition} from 'flipper-plugin';
import {getFlipperServer} from '../flipperServer';

let loadDynamicPluginsMock: jest.Mock;

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
  loadDynamicPluginsMock = getFlipperServer().exec = jest.fn();
  loadDynamicPluginsMock.mockResolvedValue([]);
});

test('getDynamicPlugins returns empty array on errors', async () => {
  loadDynamicPluginsMock.mockRejectedValue(new Error('ooops'));
  const res = await getDynamicPlugins();
  expect(res).toEqual([]);
});

test('checkDisabled', () => {
  const disabledPlugin = 'pluginName';
  const hostConfig = {
    processConfig: {
      disabledPlugins: [disabledPlugin],
    },
    env: {},
  } as any;
  const disabled = checkDisabled([], hostConfig);

  expect(
    disabled({
      ...sampleInstalledPluginDetails,
      name: 'other Name',
      version: '1.0.0',
    }),
  ).toBeTruthy();
  expect(
    disabled({
      ...sampleInstalledPluginDetails,
      name: disabledPlugin,
      version: '1.0.0',
    }),
  ).toBeFalsy();
});

test('checkGK for plugin without GK', () => {
  expect(
    checkGK([])({
      ...sampleInstalledPluginDetails,
      name: 'pluginID',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for passing plugin', () => {
  expect(
    checkGK([])({
      ...sampleInstalledPluginDetails,
      name: 'pluginID',
      gatekeeper: 'TEST_PASSING_GK',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for failing plugin', () => {
  const gatekeepedPlugins: InstalledPluginDetails[] = [];
  const name = 'pluginID';
  const plugins = checkGK(gatekeepedPlugins)({
    ...sampleInstalledPluginDetails,
    name,
    gatekeeper: 'TEST_FAILING_GK',
    version: '1.0.0',
  });

  expect(plugins).toBeFalsy();
  expect(gatekeepedPlugins[0].name).toEqual(name);
});

test('requirePlugin returns null for invalid requires', async () => {
  const requireFn = createRequirePluginFunction(() => {
    throw new Error();
  });
  const plugin = await requireFn([])({
    ...sampleInstalledPluginDetails,
    name: 'pluginID',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
    entry: 'this/path/does not/exist',
    version: '1.0.0',
  });

  expect(plugin).toBeNull();
});

test('newest version of each plugin is used', () => {
  const sourcePlugins: InstalledPluginDetails[] = [
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin1',
      name: 'flipper-plugin-test1',
      version: '0.1.0',
    },
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin2',
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.201',
    },
  ];
  const installedPlugins: InstalledPluginDetails[] = [
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin2',
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.21',
      dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test2',
      entry: './test/index.js',
    },
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin1',
      name: 'flipper-plugin-test1',
      version: '0.10.0',
      dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test1',
      entry: './test/index.js',
    },
  ];
  const filteredPlugins = getLatestCompatibleVersionOfEachPlugin([
    ...sourcePlugins,
    ...installedPlugins,
  ]);
  expect(filteredPlugins).toHaveLength(2);
  expect(filteredPlugins).toContainEqual({
    ...sampleInstalledPluginDetails,
    id: 'TestPlugin1',
    name: 'flipper-plugin-test1',
    version: '0.10.0',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test1',
    entry: './test/index.js',
  });
  expect(filteredPlugins).toContainEqual({
    ...sampleInstalledPluginDetails,
    id: 'TestPlugin2',
    name: 'flipper-plugin-test2',
    version: '0.1.0-alpha.201',
  });
});
