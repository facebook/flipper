/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import mockfs from 'mock-fs';
import path from 'path';
import {consoleMock, normalizePath} from 'flipper-test-utils';
import getWatchFolders from '../getWatchFolders';
import fs from 'fs-extra';

describe('getWatchFolders', () => {
  const realConsole = global.console;
  global.console = consoleMock as any;

  afterAll(() => {
    global.console = realConsole;
  });

  beforeEach(() => {});

  afterEach(() => {
    mockfs.restore();
  });

  test('getWatchFolders correctly resolves symlinked packages', async () => {
    const rootDir =
      process.platform === 'win32' ? 'C:\\test\\root' : '/test/root';
    const files = {
      [rootDir]: {
        node_modules: {
          installed_module_1: {},
          local_module_1: mockfs.symlink({path: '../local_module_1'}),
          local_module_2: mockfs.symlink({path: '../local_module_2'}),
          plugin_module_1: mockfs.symlink({path: '../plugins/plugin_module_1'}),
          plugin_module_2: mockfs.symlink({path: '../plugins/plugin_module_2'}),
          fb_plugin_module_1: mockfs.symlink({
            path: '../plugins/fb/fb_plugin_module_1',
          }),
          fb_plugin_module_2: mockfs.symlink({
            path: '../plugins/fb/fb_plugin_module_2',
          }),
          '@scoped': {
            local_module_3: mockfs.symlink({
              path: '../../local_module_3',
            }),
          },
        },
        local_module_1: {
          'package.json': '{"dependencies": {"installed_module_1": "1.0.0"}}',
        },
        local_module_2: {
          'package.json':
            '{"dependencies": {"fb_plugin_module_1": "1.0.0", "plugin_module_1": "1.0.0"}}',
        },
        local_module_3: {
          'package.json': '{"dependencies": {"installed_module_1": "1.0.0"}}',
        },
        plugins: {
          plugin_module_1: {
            'package.json':
              '{"dependencies": {"local_module_2": "1.0.0", "@scoped/local_module_3": "1.0.0"}}',
          },
          plugin_module_2: {
            'package.json': '{"dependencies": {"fb_plugin_module_1": "1.0.0"}}',
          },
          fb: {
            node_modules: {
              installed_module_2: {},
            },
            fb_plugin_module_1: {
              'package.json': '{"dependencies": {"plugin_module_2": "1.0.0"}}',
            },
            fb_plugin_module_2: {
              'package.json': '{"dependencies": {}}',
            },
          },
        },
      },
    };
    mockfs(files);
    const readJsonMock = async (file: string) => {
      if (!file.startsWith(rootDir)) {
        throw new Error('File not found: ' + file);
      }
      const parts = file.substring(rootDir.length + 1).split(path.sep);
      let cur = <any>files[rootDir];
      for (const part of parts) {
        cur = cur[part];
        if (!cur) {
          throw new Error(`File part "${part}" not found: ${file}`);
        }
      }
      return JSON.parse(cur);
    };
    const readReadJson = fs.readJson;
    try {
      fs.readJson = <any>readJsonMock;
      const resolvedFolders = await getWatchFolders(
        path.join(rootDir, 'local_module_2'),
      );
      expect(resolvedFolders.map(normalizePath)).toMatchInlineSnapshot(`
        Array [
          "/test/root/local_module_2",
          "/test/root/node_modules",
          "/test/root/plugins/fb/fb_plugin_module_1",
          "/test/root/plugins/fb/node_modules",
          "/test/root/plugins/plugin_module_1",
          "/test/root/plugins/plugin_module_2",
          "/test/root/local_module_3",
        ]
      `);
    } finally {
      fs.readJson = readReadJson;
    }
  });
});
