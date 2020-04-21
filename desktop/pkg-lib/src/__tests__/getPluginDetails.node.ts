/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import getPluginDetails from '../getPluginDetails';

test('getPluginDetailsV1', async () => {
  const pluginV1 = {
    name: 'flipper-plugin-test',
    version: '2.0.0',
    title: 'Test Plugin',
    main: 'src/index.tsx',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV1);
  const details = await getPluginDetails('./plugins/flipper-plugin-test');
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "dir": "./plugins/flipper-plugin-test",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "main": "dist/index.js",
      "name": "flipper-plugin-test",
      "source": "src/index.tsx",
      "specVersion": 1,
      "title": "Test Plugin",
      "version": "2.0.0",
    }
  `);
});

test('getPluginDetailsV2', async () => {
  const pluginV2 = {
    specVersion: 2,
    name: 'flipper-plugin-test',
    title: 'Test',
    version: '3.0.1',
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getPluginDetails('./plugins/flipper-plugin-test');
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "dir": "./plugins/flipper-plugin-test",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "source": "src/index.tsx",
      "specVersion": 2,
      "title": "Test",
      "version": "3.0.1",
    }
  `);
});

test('id used as title if the latter omited', async () => {
  const pluginV2 = {
    specVersion: 2,
    name: 'flipper-plugin-test',
    id: 'test',
    version: '3.0.1',
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getPluginDetails('./plugins/flipper-plugin-test');
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "dir": "./plugins/flipper-plugin-test",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "test",
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "source": "src/index.tsx",
      "specVersion": 2,
      "title": "test",
      "version": "3.0.1",
    }
  `);
});

test('name without "flipper-plugin-" prefix is used as title if the latter omited', async () => {
  const pluginV2 = {
    specVersion: 2,
    name: 'flipper-plugin-test',
    version: '3.0.1',
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getPluginDetails('./plugins/flipper-plugin-test');
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "dir": "./plugins/flipper-plugin-test",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "source": "src/index.tsx",
      "specVersion": 2,
      "title": "test",
      "version": "3.0.1",
    }
  `);
});
