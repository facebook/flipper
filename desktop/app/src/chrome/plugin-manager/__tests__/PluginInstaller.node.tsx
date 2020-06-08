/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {annotatePluginsWithUpdates} from '../PluginInstaller';
import {UpdateResult} from '../../../utils/pluginManager';
import {PluginDetails} from 'flipper-plugin-lib';

test('annotatePluginsWithUpdates', async () => {
  const installedPlugins = new Map<string, PluginDetails>([
    [
      'example',
      {
        name: 'example',
        version: '0.1.0',
        description: 'Gaze into the death crystal',
        dir: '/plugins/example',
        specVersion: 2,
        source: 'src/index.ts',
        isDefault: false,
        main: 'lib/index.js',
        title: 'Example',
        id: 'Example',
        entry: '/plugins/example/lib/index.js',
      },
    ],
    [
      'ricksybusiness',
      {
        name: 'ricksybusiness',
        version: '1.0.0',
        description: 'Rick Die Rickpeat',
        dir: '/plugins/example',
        specVersion: 2,
        source: 'src/index.ts',
        isDefault: false,
        main: 'lib/index.js',
        title: 'ricksybusiness',
        id: 'ricksybusiness',
        entry: '/plugins/ricksybusiness/lib/index.js',
      },
    ],
  ]);
  const updates = new Map<string, UpdateResult>([
    ['example', {kind: 'update-available', version: '1.1.0'}],
  ]);
  const res = annotatePluginsWithUpdates(installedPlugins, updates);
  expect(res).toMatchInlineSnapshot(`
    Map {
      "example" => Object {
        "description": "Gaze into the death crystal",
        "dir": "/plugins/example",
        "entry": "/plugins/example/lib/index.js",
        "id": "Example",
        "isDefault": false,
        "main": "lib/index.js",
        "name": "example",
        "source": "src/index.ts",
        "specVersion": 2,
        "title": "Example",
        "updateStatus": Object {
          "kind": "update-available",
          "version": "1.1.0",
        },
        "version": "0.1.0",
      },
      "ricksybusiness" => Object {
        "description": "Rick Die Rickpeat",
        "dir": "/plugins/example",
        "entry": "/plugins/ricksybusiness/lib/index.js",
        "id": "ricksybusiness",
        "isDefault": false,
        "main": "lib/index.js",
        "name": "ricksybusiness",
        "source": "src/index.ts",
        "specVersion": 2,
        "title": "ricksybusiness",
        "updateStatus": Object {
          "kind": "up-to-date",
        },
        "version": "1.0.0",
      },
    }
  `);
});
