/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import runLint from '../utils/runLint';
import fs from 'fs-extra';
import path from 'path';

const validPackageJson = {
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
  bugs: {
    email: 'oncall+flipper@xmail.facebook.com',
    url: 'https://fb.workplace.com/groups/flippersupport/',
  },
};

jest.mock('fs-extra', () => {
  const mod = {
    ...jest.requireActual('fs-extra'),
    readFile: jest.fn(),
    pathExists: jest.fn().mockResolvedValue(true),
    pathExistsSync: jest.fn().mockResolvedValue(true),
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

test('valid package json', async () => {
  const json = JSON.stringify(validPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toBe(null);
});

test('valid scoped package json', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  testPackageJson.name = '@test/flipper-plugin-package';
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toBe(null);
});

test('$schema field is required', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  // @ts-ignore cannot delete non-optional fields
  delete testPackageJson.$schema;
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toMatchInlineSnapshot(`
    [
      ". should have required property "$schema" pointing to a supported schema URI, e.g.:
    {
     "$schema": "https://fbflipper.com/schemas/plugin-package/v2.json",
     "name": "flipper-plugin-example",
     ...
    }",
    ]
  `);
});

test('supported schema is required', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  testPackageJson.$schema =
    'https://fbflipper.com/schemas/plugin-package/v1.json';
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toMatchInlineSnapshot(`
    [
      ".$schema should point to a supported schema. Currently supported schemas:
    - https://fbflipper.com/schemas/plugin-package/v2.json",
    ]
  `);
});

test('name is required', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  // @ts-ignore cannot delete non-optional fields
  delete testPackageJson.name;
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toMatchInlineSnapshot(`
    [
      ". should have required property 'name'",
    ]
  `);
});

test('name must start with "flipper-plugin-"', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  testPackageJson.name = 'test-plugin';
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toMatchInlineSnapshot(`
    [
      "/name should start with "flipper-plugin-", e.g. "flipper-plugin-example"",
    ]
  `);
});

test('keywords must contain "flipper-plugin"', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  testPackageJson.keywords = ['flipper', 'network'];
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toMatchInlineSnapshot(`
    [
      "/keywords should contain keyword "flipper-plugin"",
    ]
  `);
});

test('flippeBundlerEntry must point to an existing file', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  testPackageJson.flipperBundlerEntry = 'unexisting/file';
  (fs.pathExistsSync as any as jest.Mock).mockImplementation(
    (filePath) => !filePath.includes(path.join('unexisting', 'file')),
  );
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toMatchInlineSnapshot(`
    [
      "/flipperBundlerEntry should point to a valid file",
    ]
  `);
});

test('multiple validation errors reported', async () => {
  const testPackageJson = Object.assign({}, validPackageJson);
  testPackageJson.keywords = ['flipper'];
  // @ts-ignore cannot delete non-optional fields
  delete testPackageJson.flipperBundlerEntry;
  const json = JSON.stringify(testPackageJson);
  (fs.readFile as any as jest.Mock).mockReturnValueOnce(new Buffer(json));
  const result = await runLint('dir');
  expect(result).toMatchInlineSnapshot(`
    [
      ". should have required property 'flipperBundlerEntry'",
      "/keywords should contain keyword "flipper-plugin"",
    ]
  `);
});
