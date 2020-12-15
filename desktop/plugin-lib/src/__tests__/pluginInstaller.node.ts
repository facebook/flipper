/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {
  getInstalledPlugins,
  cleanupOldInstalledPluginVersions,
  moveInstalledPluginsFromLegacyDir,
} from '../pluginInstaller';
import {
  legacyPluginInstallationDir,
  pluginInstallationDir,
} from '../pluginPaths';
import fs from 'fs-extra';
import mockfs from 'mock-fs';
import FileSystem from 'mock-fs/lib/filesystem';
import {normalizePath} from 'flipper-test-utils';

function createMockPackageJsonContent(name: string, version: string) {
  return `
    {
      "$schema": "https://fbflipper.com/schemas/plugin-package/v2.json",
      "name": "${name}",
      "version": "${version}",
      "main": "dist/bundle.js"
    }
`;
}

const installedPluginFiles: FileSystem.DirectoryItems = {
  [pluginInstallationDir]: {
    'flipper-plugin-test1': {
      '1.2.0': {
        'package.json': createMockPackageJsonContent(
          'flipper-plugin-test1',
          '1.2.0',
        ),
      },
      '11.2.0': {
        'package.json': createMockPackageJsonContent(
          'flipper-plugin-test1',
          '11.2.0',
        ),
      },
    },
    'flipper-plugin-test2': {
      '0.3.0': {
        'package.json': createMockPackageJsonContent(
          'flipper-plugin-test2',
          '0.3.0',
        ),
      },
      '0.2.0': {
        'package.json': createMockPackageJsonContent(
          'flipper-plugin-test2',
          '0.2.0',
        ),
      },
      '0.1.0': {
        'package.json': createMockPackageJsonContent(
          'flipper-plugin-test2',
          '0.1.0',
        ),
      },
    },
    'flipper-plugin-test3': {
      '2.0.0-beta.1': {
        'package.json': createMockPackageJsonContent(
          'flipper-plugin-test3',
          '2.0.0-beta.1',
        ),
      },
    },
  },
  [legacyPluginInstallationDir]: {
    'flipper-plugin-test4': {
      'package.json': createMockPackageJsonContent(
        'flipper-plugin-test4',
        '1.0.0',
      ),
    },
    'flipper-plugin-test5': {
      'package.json': createMockPackageJsonContent(
        'flipper-plugin-test5',
        '0.0.1',
      ),
    },
  },
};

const fileContent = new Map<string, string>();

collectFileContent('', installedPluginFiles, fileContent);

function collectFileContent(
  cur: string,
  dirs: FileSystem.DirectoryItems,
  files: Map<string, string>,
) {
  for (const entry of Object.entries(dirs)) {
    const next = path.join(cur, entry[0]);
    if (typeof entry[1] === 'string') {
      files.set(normalizePath(next), entry[1]);
    } else if (typeof entry[1] === 'function') {
      throw new Error('Not supported');
    } else if (Buffer.isBuffer(entry[1])) {
      throw new Error('Not supported');
    } else {
      collectFileContent(next, entry[1], files);
    }
  }
}

describe('pluginInstaller', () => {
  let readJson: any;
  beforeEach(() => {
    mockfs(installedPluginFiles);
    readJson = fs.readJson;
    fs.readJson = (file: string) => {
      const content = fileContent.get(normalizePath(file));
      if (content) {
        return Promise.resolve(JSON.parse(content));
      } else {
        return Promise.resolve(undefined);
      }
    };
  });

  afterEach(() => {
    mockfs.restore();
    fs.readJson = readJson;
  });

  test('getInstalledPlugins', async () => {
    const plugins = await getInstalledPlugins();
    expect(plugins).toHaveLength(3);
    expect(plugins.map((p) => p.version).sort()).toEqual([
      '0.3.0',
      '11.2.0',
      '2.0.0-beta.1',
    ]);
  });

  test('moveInstalledPluginsFromLegacyDir', async () => {
    await moveInstalledPluginsFromLegacyDir();
    expect(
      fs.pathExistsSync(
        path.join(
          pluginInstallationDir,
          'flipper-plugin-test4',
          '1.0.0',
          'package.json',
        ),
      ),
    ).toBeTruthy();
    expect(
      fs.pathExistsSync(
        path.join(
          pluginInstallationDir,
          'flipper-plugin-test5',
          '0.0.1',
          'package.json',
        ),
      ),
    ).toBeTruthy();
    expect(fs.pathExistsSync(legacyPluginInstallationDir)).toBeFalsy();
  });

  test('cleanupOldInstalledPluginVersions(1)', async () => {
    await cleanupOldInstalledPluginVersions(1);
    const subdirs1 = await fs.readdir(
      path.join(pluginInstallationDir, 'flipper-plugin-test1'),
    );
    const subdirs2 = await fs.readdir(
      path.join(pluginInstallationDir, 'flipper-plugin-test2'),
    );
    const subdirs3 = await fs.readdir(
      path.join(pluginInstallationDir, 'flipper-plugin-test3'),
    );
    expect(subdirs1.sort()).toEqual(['11.2.0']);
    expect(subdirs2.sort()).toEqual(['0.3.0']);
    expect(subdirs3.sort()).toEqual(['2.0.0-beta.1']);
  });

  test('cleanupOldInstalledPluginVersions(2)', async () => {
    await cleanupOldInstalledPluginVersions(2);
    const subdirs1 = await fs.readdir(
      path.join(pluginInstallationDir, 'flipper-plugin-test1'),
    );
    const subdirs2 = await fs.readdir(
      path.join(pluginInstallationDir, 'flipper-plugin-test2'),
    );
    const subdirs3 = await fs.readdir(
      path.join(pluginInstallationDir, 'flipper-plugin-test3'),
    );
    expect(subdirs1.sort()).toEqual(['1.2.0', '11.2.0']);
    expect(subdirs2.sort()).toEqual(['0.2.0', '0.3.0']);
    expect(subdirs3.sort()).toEqual(['2.0.0-beta.1']);
  });
});
