/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import runMigrate from '../utils/runMigrate';
import fs from 'fs-extra';

const packageJsonV2 = {
  $schema: 'https://fbflipper.com/schemas/plugin-package/v2.json',
  name: 'flipper-plugin-network',
  id: 'Network',
  flipperBundlerEntry: 'index.tsx',
  main: 'dist/index.js',
  title: 'Network',
  description:
    'Use the Network inspector to inspect outgoing network traffic in your apps.',
  icon: 'internet',
  version: '1.0.0',
  license: 'MIT',
  keywords: ['network', 'flipper-plugin'],
  scripts: {
    prepack: 'yarn reset && yarn build',
  },
  bugs: {
    email: 'example@test.com',
    url: 'https://github.com/facebook/flipper',
  },
};

let convertedPackageJsonString: string | undefined;

jest.mock('fs-extra', () => {
  const packageJsonV1 = {
    name: 'Fresco',
    version: '1.0.0',
    main: 'index.tsx',
    license: 'MIT',
    keywords: ['images'],
    dependencies: {
      flipper: 'latest',
    },
    scripts: {
      prepack: 'yarn reset && yarn build',
    },
    title: 'Images',
    icon: 'profile',
    bugs: {
      email: 'example@test.com',
    },
  };

  const mod = {
    ...jest.requireActual('fs-extra'),
    readFile: jest
      .fn()
      .mockResolvedValue(new Buffer(JSON.stringify(packageJsonV1))),
    pathExists: jest.fn().mockResolvedValue(true),
    pathExistsSync: jest.fn().mockResolvedValue(true),
    readJson: jest.fn().mockResolvedValue(packageJsonV1),
    writeFile: jest.fn(async (_path, content) => {
      convertedPackageJsonString = content;
    }),
    lstatSync: jest.fn().mockReturnValue({
      isFile: function () {
        return true;
      },
    }),
  };

  return {
    ...mod,
    default: mod,
  };
});

beforeEach(() => {
  convertedPackageJsonString = undefined;
});

test('converts package.json and adds dependencies', async () => {
  const error = await runMigrate('dir');
  expect(error).toBeUndefined();
  expect(convertedPackageJsonString).toMatchInlineSnapshot(`
    "{
      "$schema": "https://fbflipper.com/schemas/plugin-package/v2.json",
      "name": "flipper-plugin-fresco",
      "id": "Fresco",
      "version": "1.0.0",
      "main": "dist/bundle.js",
      "flipperBundlerEntry": "index.tsx",
      "license": "MIT",
      "keywords": [
        "flipper-plugin",
        "images"
      ],
      "peerDependencies": {
        "flipper": "latest"
      },
      "devDependencies": {
        "flipper": "latest",
        "flipper-pkg": "latest"
      },
      "scripts": {
        "prepack": "yarn reset && yarn build && flipper-pkg lint && flipper-pkg bundle"
      },
      "title": "Images",
      "icon": "profile",
      "bugs": {
        "email": "example@test.com"
      }
    }"
  `);
});

test('converts package.json without changing dependencies', async () => {
  const error = await runMigrate('dir', {noDependencies: true});
  expect(error).toBeUndefined();
  expect(convertedPackageJsonString).toMatchInlineSnapshot(`
    "{
      "$schema": "https://fbflipper.com/schemas/plugin-package/v2.json",
      "name": "flipper-plugin-fresco",
      "id": "Fresco",
      "version": "1.0.0",
      "main": "dist/bundle.js",
      "flipperBundlerEntry": "index.tsx",
      "license": "MIT",
      "keywords": [
        "flipper-plugin",
        "images"
      ],
      "dependencies": {
        "flipper": "latest"
      },
      "scripts": {
        "prepack": "yarn reset && yarn build && flipper-pkg lint && flipper-pkg bundle"
      },
      "title": "Images",
      "icon": "profile",
      "bugs": {
        "email": "example@test.com"
      }
    }"
  `);
});

test('does not migrate already migrated packages', async () => {
  (fs.readFile as any as jest.Mock).mockResolvedValue(
    new Buffer(JSON.stringify(packageJsonV2)),
  );
  const error = await runMigrate('dir');
  expect(error).toBeUndefined();
  expect(convertedPackageJsonString).toBeUndefined();
});
