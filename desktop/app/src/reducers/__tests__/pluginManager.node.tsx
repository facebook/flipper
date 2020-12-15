/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as reducer, registerInstalledPlugins} from '../pluginManager';
import {InstalledPluginDetails} from 'flipper-plugin-lib';

test('reduce empty registerInstalledPlugins', () => {
  const result = reducer(undefined, registerInstalledPlugins([]));
  expect(result.installedPlugins).toEqual(new Map());
});

const EXAMPLE_PLUGIN = {
  name: 'test',
  version: '0.1',
  description: 'my test plugin',
  dir: '/plugins/test',
  specVersion: 2,
  source: 'src/index.ts',
  isBundled: false,
  isActivatable: true,
  main: 'lib/index.js',
  title: 'test',
  id: 'test',
  entry: '/plugins/test/lib/index.js',
} as InstalledPluginDetails;

test('reduce registerInstalledPlugins, clear again', () => {
  const result = reducer(undefined, registerInstalledPlugins([EXAMPLE_PLUGIN]));
  expect(result.installedPlugins).toEqual(
    new Map([[EXAMPLE_PLUGIN.name, EXAMPLE_PLUGIN]]),
  );
  const result2 = reducer(result, registerInstalledPlugins([]));
  expect(result2.installedPlugins).toEqual(new Map());
});
