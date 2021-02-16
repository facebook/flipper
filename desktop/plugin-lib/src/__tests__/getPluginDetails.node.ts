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
import {getInstalledPluginDetails} from '../getPluginDetails';
import {pluginInstallationDir} from '../pluginPaths';
import {normalizePath} from 'flipper-test-utils';

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
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/plugins/flipper-plugin-test@2.0.0.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "isBundled": false,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "source": "src/index.tsx",
      "specVersion": 1,
      "supportedDevices": undefined,
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
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "isBundled": false,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedDevices": undefined,
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
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "test",
      "isActivatable": true,
      "isBundled": false,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedDevices": undefined,
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
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "isBundled": false,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedDevices": undefined,
      "title": "test",
      "version": "3.0.1",
    }
  `);
});

test('flipper-plugin-version is parsed', async () => {
  const pluginV2 = {
    $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
    name: 'flipper-plugin-test',
    version: '3.0.1',
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    description: 'Description of Test Plugin',
    gatekeeper: 'GK_flipper_plugin_test',
    peerDependencies: {
      'flipper-plugin': '^0.45',
    },
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": "^0.45",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "isBundled": false,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedDevices": undefined,
      "title": "test",
      "version": "3.0.1",
    }
  `);
});

test('plugin type and supported devices parsed', async () => {
  const pluginV2 = {
    $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
    name: 'flipper-plugin-test',
    title: 'Test',
    version: '3.0.1',
    pluginType: 'device',
    supportedDevices: [
      {os: 'Android', archived: false},
      {os: 'Android', type: 'physical', specs: ['KaiOS']},
      {os: 'iOS', type: 'emulator'},
    ],
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    description: 'Description of Test Plugin',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  jest.mock('fs-extra', () => jest.fn());
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    Object {
      "bugs": undefined,
      "category": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "isBundled": false,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": "device",
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedDevices": Array [
        Object {
          "archived": false,
          "os": "Android",
        },
        Object {
          "os": "Android",
          "specs": Array [
            "KaiOS",
          ],
          "type": "physical",
        },
        Object {
          "os": "iOS",
          "type": "emulator",
        },
      ],
      "title": "Test",
      "version": "3.0.1",
    }
  `);
});
