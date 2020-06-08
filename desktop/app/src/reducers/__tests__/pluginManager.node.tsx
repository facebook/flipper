/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as reducer, registerInstalledPlugins} from '../pluginManager';

test('reduce empty registerInstalledPlugins', () => {
  const result = reducer(undefined, registerInstalledPlugins(new Map()));
  expect(result).toEqual({installedPlugins: new Map()});
});

const EXAMPLE_PLUGIN = {
  name: 'test',
  version: '0.1',
  description: 'my test plugin',
  dir: '/plugins/test',
  specVersion: 2,
  source: 'src/index.ts',
  isDefault: false,
  main: 'lib/index.js',
  title: 'test',
  id: 'test',
  entry: '/plugins/test/lib/index.js',
};

test('reduce registerInstalledPlugins, clear again', () => {
  const result = reducer(
    undefined,
    registerInstalledPlugins(new Map([['test', EXAMPLE_PLUGIN]])),
  );
  expect(result).toEqual({
    installedPlugins: new Map([['test', EXAMPLE_PLUGIN]]),
  });

  const result2 = reducer(result, registerInstalledPlugins(new Map()));
  expect(result2).toEqual({installedPlugins: new Map()});
});
