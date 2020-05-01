/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import runMigrate from '../utils/runMigrate';
import fs from 'fs-extra';

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

beforeEach(() => {
  jest.mock('fs-extra', () => jest.fn());
  fs.pathExists = jest.fn().mockResolvedValue(true);
  fs.pathExistsSync = jest.fn().mockReturnValue(true);
  fs.readJson = jest.fn().mockResolvedValue(packageJsonV1);
  fs.readFile = jest
    .fn()
    .mockResolvedValue(new Buffer(JSON.stringify(packageJsonV1)));
  convertedPackageJsonString = undefined;
  fs.writeFile = jest.fn().mockImplementation(async (_path, content) => {
    convertedPackageJsonString = content;
  });
});

test('converts package.json and adds dependencies', async () => {
  const error = await runMigrate('dir');
  expect(error).toBeUndefined();
  expect(convertedPackageJsonString).toMatchInlineSnapshot(`
    "{
      \\"$schema\\": \\"https://fbflipper.com/schemas/plugin-package/v2.json\\",
      \\"name\\": \\"flipper-plugin-fresco\\",
      \\"id\\": \\"Fresco\\",
      \\"version\\": \\"1.0.0\\",
      \\"main\\": \\"dist/bundle.js\\",
      \\"flipperBundlerEntry\\": \\"index.tsx\\",
      \\"license\\": \\"MIT\\",
      \\"keywords\\": [
        \\"flipper-plugin\\",
        \\"images\\"
      ],
      \\"peerDependencies\\": {
        \\"flipper\\": \\"latest\\"
      },
      \\"devDependencies\\": {
        \\"flipper\\": \\"latest\\",
        \\"flipper-pkg\\": \\"latest\\"
      },
      \\"scripts\\": {
        \\"prepack\\": \\"yarn reset && yarn build && flipper-pkg lint && flipper-pkg bundle\\"
      },
      \\"title\\": \\"Images\\",
      \\"icon\\": \\"profile\\",
      \\"bugs\\": {
        \\"email\\": \\"example@test.com\\"
      }
    }"
  `);
});

test('converts package.json without changing dependencies', async () => {
  const error = await runMigrate('dir', {noDependencies: true});
  expect(error).toBeUndefined();
  expect(convertedPackageJsonString).toMatchInlineSnapshot(`
    "{
      \\"$schema\\": \\"https://fbflipper.com/schemas/plugin-package/v2.json\\",
      \\"name\\": \\"flipper-plugin-fresco\\",
      \\"id\\": \\"Fresco\\",
      \\"version\\": \\"1.0.0\\",
      \\"main\\": \\"dist/bundle.js\\",
      \\"flipperBundlerEntry\\": \\"index.tsx\\",
      \\"license\\": \\"MIT\\",
      \\"keywords\\": [
        \\"flipper-plugin\\",
        \\"images\\"
      ],
      \\"dependencies\\": {
        \\"flipper\\": \\"latest\\"
      },
      \\"scripts\\": {
        \\"prepack\\": \\"yarn reset && yarn build && flipper-pkg lint && flipper-pkg bundle\\"
      },
      \\"title\\": \\"Images\\",
      \\"icon\\": \\"profile\\",
      \\"bugs\\": {
        \\"email\\": \\"example@test.com\\"
      }
    }"
  `);
});

test('does not migrate already migrated packages', async () => {
  fs.readJson = jest.fn().mockResolvedValue(packageJsonV2);
  fs.readFile = jest
    .fn()
    .mockResolvedValue(new Buffer(JSON.stringify(packageJsonV2)));
  const error = await runMigrate('dir');
  expect(error).toBeUndefined();
  expect(convertedPackageJsonString).toBeUndefined();
});
