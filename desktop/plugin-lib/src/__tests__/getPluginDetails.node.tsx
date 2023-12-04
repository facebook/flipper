/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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

jest.mock('fs-extra');

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
  // @ts-expect-error this is read only and it is fine, this is a test
  fs.readJson = jest.fn().mockImplementation(() => pluginV1);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": undefined,
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/plugins/flipper-plugin-test@2.0.0.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "serverAddOnEntry": undefined,
      "source": "src/index.tsx",
      "specVersion": 1,
      "supportedApps": undefined,
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
  // @ts-expect-error this is read only and it is fine, this is a test
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": undefined,
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "publishedDocs": undefined,
      "serverAddOn": undefined,
      "serverAddOnEntry": undefined,
      "serverAddOnSource": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedApps": undefined,
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
  // @ts-expect-error this is read only and it is fine, this is a test
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": undefined,
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "publishedDocs": undefined,
      "serverAddOn": undefined,
      "serverAddOnEntry": undefined,
      "serverAddOnSource": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedApps": undefined,
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
  // @ts-expect-error this is read only and it is fine, this is a test
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": undefined,
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "publishedDocs": undefined,
      "serverAddOn": undefined,
      "serverAddOnEntry": undefined,
      "serverAddOnSource": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedApps": undefined,
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
  // @ts-expect-error this is read only and it is fine, this is a test
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": undefined,
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": "^0.45",
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": undefined,
      "publishedDocs": undefined,
      "serverAddOn": undefined,
      "serverAddOnEntry": undefined,
      "serverAddOnSource": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedApps": undefined,
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
  // @ts-expect-error this is read only and it is fine, this is a test
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": undefined,
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": "device",
      "publishedDocs": undefined,
      "serverAddOn": undefined,
      "serverAddOnEntry": undefined,
      "serverAddOnSource": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedApps": undefined,
      "supportedDevices": [
        {
          "archived": false,
          "os": "Android",
        },
        {
          "os": "Android",
          "specs": [
            "KaiOS",
          ],
          "type": "physical",
        },
        {
          "os": "iOS",
          "type": "emulator",
        },
      ],
      "title": "Test",
      "version": "3.0.1",
    }
  `);
});

test('plugin type and supported apps parsed', async () => {
  const pluginV2 = {
    $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
    name: 'flipper-plugin-test',
    title: 'Test',
    version: '3.0.1',
    pluginType: 'client',
    supportedApps: [
      {appID: 'Messenger', os: 'Android', type: 'emulator'},
      {appID: 'Instagram', os: 'Android', type: 'physical'},
      {appID: 'Facebook', os: 'iOS', type: 'emulator'},
    ],
    main: 'dist/bundle.js',
    flipperBundlerEntry: 'src/index.tsx',
    description: 'Description of Test Plugin',
    gatekeeper: 'GK_flipper_plugin_test',
  };
  // @ts-expect-error this is read only and it is fine, this is a test
  fs.readJson = jest.fn().mockImplementation(() => pluginV2);
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": undefined,
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": "client",
      "publishedDocs": undefined,
      "serverAddOn": undefined,
      "serverAddOnEntry": undefined,
      "serverAddOnSource": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedApps": [
        {
          "appID": "Messenger",
          "os": "Android",
          "type": "emulator",
        },
        {
          "appID": "Instagram",
          "os": "Android",
          "type": "physical",
        },
        {
          "appID": "Facebook",
          "os": "iOS",
          "type": "emulator",
        },
      ],
      "supportedDevices": undefined,
      "title": "Test",
      "version": "3.0.1",
    }
  `);
});

test('can merge two package.json files', async () => {
  const pluginBase = {
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
    bugs: {
      url: 'https://github.com/facebook/flipper/issues',
    },
  };
  const pluginAdditional = {
    gatekeeper: 'GK_flipper_plugin_test',
    bugs: {
      url: 'https://fb.com/groups/flippersupport',
      email: 'flippersupport@example.localhost',
    },
  };
  const mockedFs = jest.mocked(fs);
  mockedFs.readJson.mockImplementation((file): any => {
    if (file === path.join(pluginPath, 'package.json')) {
      return pluginBase;
    } else if (file === path.join(pluginPath, 'fb', 'package.json')) {
      return pluginAdditional;
    }
  });
  mockedFs.pathExists.mockImplementation(() => Promise.resolve(true));
  const details = await getInstalledPluginDetails(pluginPath);
  details.dir = normalizePath(details.dir);
  details.entry = normalizePath(details.entry);
  expect(details).toMatchInlineSnapshot(`
    {
      "bugs": {
        "email": "flippersupport@example.localhost",
        "url": "https://fb.com/groups/flippersupport",
      },
      "category": undefined,
      "deprecated": undefined,
      "description": "Description of Test Plugin",
      "dir": "/Users/mock/.flipper/thirdparty/flipper-plugin-test",
      "engines": undefined,
      "entry": "/Users/mock/.flipper/thirdparty/flipper-plugin-test/dist/bundle.js",
      "flipperSDKVersion": undefined,
      "gatekeeper": "GK_flipper_plugin_test",
      "icon": undefined,
      "id": "flipper-plugin-test",
      "isActivatable": true,
      "main": "dist/bundle.js",
      "name": "flipper-plugin-test",
      "pluginType": "device",
      "publishedDocs": {
        "overview": true,
        "setup": true,
      },
      "serverAddOn": undefined,
      "serverAddOnEntry": undefined,
      "serverAddOnSource": undefined,
      "source": "src/index.tsx",
      "specVersion": 2,
      "supportedApps": undefined,
      "supportedDevices": [
        {
          "archived": false,
          "os": "Android",
        },
        {
          "os": "Android",
          "specs": [
            "KaiOS",
          ],
          "type": "physical",
        },
        {
          "os": "iOS",
          "type": "emulator",
        },
      ],
      "title": "Test",
      "version": "3.0.1",
    }
  `);
});
