/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.mock('../pluginInstaller');
jest.mock('../getNpmHostedPlugins');

import {getUpdatablePlugins} from '../getUpdatablePlugins';
import {
  getNpmHostedPlugins,
  NpmPackageDescriptor,
} from '../getNpmHostedPlugins';
import {getInstalledPlugins} from '../pluginInstaller';
import {mocked} from 'ts-jest/utils';
import type {Package} from 'npm-api';
import {InstalledPluginDetails} from '../PluginDetails';

jest.mock('npm-api', () => {
  return jest.fn().mockImplementation(() => {
    return {
      repo: jest.fn().mockImplementation((name: string) => {
        let pkg: Package | undefined;
        if (name === 'flipper-plugin-hello') {
          pkg = {
            $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
            name: 'flipper-plugin-hello',
            title: 'Hello',
            version: '0.1.0',
            main: 'dist/bundle.js',
            flipperBundlerEntry: 'src/index.js',
            description: 'World?',
          };
        } else if (name === 'flipper-plugin-world') {
          pkg = {
            $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
            name: 'flipper-plugin-world',
            title: 'World',
            version: '0.3.0',
            main: 'dist/bundle.js',
            flipperBundlerEntry: 'src/index.js',
            description: 'World?',
          };
        }
        return {
          package: jest.fn().mockImplementation(() => Promise.resolve(pkg)),
        };
      }),
    };
  });
});

const installedPlugins: InstalledPluginDetails[] = [
  {
    name: 'flipper-plugin-hello',
    entry: './test/index.js',
    version: '0.1.0',
    specVersion: 2,
    main: 'dist/bundle.js',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample1',
    source: 'src/index.js',
    id: 'Hello',
    title: 'Hello',
    description: 'World?',
    isBundled: false,
    isActivatable: true,
  },
  {
    name: 'flipper-plugin-world',
    entry: './test/index.js',
    version: '0.2.0',
    specVersion: 2,
    main: 'dist/bundle.js',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample2',
    source: 'src/index.js',
    id: 'World',
    title: 'World',
    description: 'Hello?',
    isBundled: false,
    isActivatable: true,
  },
];

const updates: NpmPackageDescriptor[] = [
  {name: 'flipper-plugin-hello', version: '0.1.0'},
  {name: 'flipper-plugin-world', version: '0.3.0'},
];

test('annotatePluginsWithUpdates', async () => {
  const getInstalledPluginsMock = mocked(getInstalledPlugins);
  getInstalledPluginsMock.mockReturnValue(Promise.resolve(installedPlugins));

  const getNpmHostedPluginsMock = mocked(getNpmHostedPlugins);
  getNpmHostedPluginsMock.mockReturnValue(Promise.resolve(updates));

  const res = await getUpdatablePlugins();

  expect(res.length).toBe(2);
  expect({
    name: res[0].name,
    version: res[0].version,
    updateStatus: res[0].updateStatus,
  }).toMatchInlineSnapshot(`
    Object {
      "name": "flipper-plugin-hello",
      "updateStatus": Object {
        "kind": "up-to-date",
      },
      "version": "0.1.0",
    }
  `);

  expect({
    name: res[1].name,
    version: res[1].version,
    updateStatus: res[1].updateStatus,
  }).toMatchInlineSnapshot(`
    Object {
      "name": "flipper-plugin-world",
      "updateStatus": Object {
        "kind": "update-available",
        "version": "0.3.0",
      },
      "version": "0.3.0",
    }
  `);
});
