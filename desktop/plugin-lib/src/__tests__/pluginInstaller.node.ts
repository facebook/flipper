/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import mockfs from 'mock-fs';
import fs from 'fs-extra';
import path from 'path';
import {consoleMock} from 'flipper-test-utils';
import {finishPendingPluginInstallations} from '../pluginInstaller';
import {
  pluginPendingInstallationDir,
  pluginInstallationDir,
} from '../pluginPaths';

describe('pluginInstaller', () => {
  const realConsole = global.console;
  global.console = consoleMock as any;

  afterAll(() => {
    global.console = realConsole;
  });

  beforeEach(() => {});

  afterEach(() => {
    mockfs.restore();
  });

  test('finish pending plugin installations', async () => {
    mockfs({
      [pluginPendingInstallationDir]: {
        'flipper-plugin-test1': {
          '1.2.0': {
            'index.ts': '',
            'package.json': '',
          },
        },
        'flipper-plugin-test2': {
          '0.3.0': {
            'index.js': '',
            '0.3.0.js': '',
            'package.json': '',
          },
          '0.2.0': {
            'index.js': '',
            '0.2.0.js': '',
            'package.json': '',
          },
        },
      },
    });

    await finishPendingPluginInstallations();

    expect(await fs.readdir(pluginInstallationDir)).toMatchInlineSnapshot(`
      Array [
        ".watchmanconfig",
        "flipper-plugin-test1",
        "flipper-plugin-test2",
      ]
    `);

    expect(
      await fs.readdir(
        path.join(pluginInstallationDir, 'flipper-plugin-test1'),
      ),
    ).toMatchInlineSnapshot(`
      Array [
        "index.ts",
        "package.json",
      ]
    `);

    expect(
      await fs.readdir(
        path.join(pluginInstallationDir, 'flipper-plugin-test2'),
      ),
    ).toMatchInlineSnapshot(`
      Array [
        "0.3.0.js",
        "index.js",
        "package.json",
      ]
    `);

    expect(
      await fs.readdir(pluginPendingInstallationDir),
    ).toMatchInlineSnapshot(`Array []`);
  });
});
