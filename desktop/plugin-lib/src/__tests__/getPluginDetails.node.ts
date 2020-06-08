/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
import getPluginDetails from '../getPluginDetails';
import {pluginInstallationDir} from '../pluginPaths';

jest.mock('../pluginPaths', () => ({
  pluginInstallationDir: '/Users/mock/.flipper/thirdparty',
  pluginCacheDir: '/Users/mock/.flipper/plugins',
}));

const pluginPath = path.join(pluginInstallationDir, 'flipper-plugin-test');

test('getPluginDetailsV1', async () => {
  const pluginV1 = {
    name: 'flipper-plugin-test',
    version: '2.0.0',
    title: 'Test Plugin',
    main: 'src/index.tsx',
    description: 'Description of Test Plugin',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV1);
  const details = await getPluginDetails(pluginPath);
  details.dir = normalizeOnWindows(details.dir);
  details.entry = normalizeOnWindows(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/plugins/flipper-plugin-test@2.0.0.js",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isDefault": false,
      "main": "dist/bundle.js",
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
    $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
    name: 'flipper-plugin-test',
    title: 'Test',
    version: '3.0.1',
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    description: 'Description of Test Plugin',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getPluginDetails(pluginPath);
  details.dir = normalizeOnWindows(details.dir);
  details.entry = normalizeOnWindows(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isDefault": false,
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
    $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
    name: 'flipper-plugin-test',
    id: 'test',
    version: '3.0.1',
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    description: 'Description of Test Plugin',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getPluginDetails(pluginPath);
  details.dir = normalizeOnWindows(details.dir);
  details.entry = normalizeOnWindows(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "test",
      "isDefault": false,
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
    $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
    name: 'flipper-plugin-test',
    version: '3.0.1',
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    description: 'Description of Test Plugin',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getPluginDetails(pluginPath);
  details.dir = normalizeOnWindows(details.dir);
  details.entry = normalizeOnWindows(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isDefault": false,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "source": "src/index.tsx",
      "specVersion": 2,
      "title": "test",
      "version": "3.0.1",
    }
  `);
});

const normalizeOnWindows = (path: string): string => {
  if (process.platform === 'win32') {
    path = path.replace(/\\/g, '/');
    path = path.substring(path.indexOf('/'));
  }
  return path;
};
