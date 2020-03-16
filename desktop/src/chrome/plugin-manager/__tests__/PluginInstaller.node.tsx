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

test('annotatePluginsWithUpdates', async () => {
  const installedPlugins = new Map([
    [
      'example',
      {
        name: 'example',
        version: '0.1.0',
        description: 'Gaze into the death crystal',
      },
    ],
    [
      'ricksybusiness',
      {
        name: 'ricksybusiness',
        version: '1.0.0',
        description: 'Rick Die Rickpeat',
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
        "name": "example",
        "updateStatus": Object {
          "kind": "update-available",
          "version": "1.1.0",
        },
        "version": "0.1.0",
      },
      "ricksybusiness" => Object {
        "description": "Rick Die Rickpeat",
        "name": "ricksybusiness",
        "updateStatus": Object {
          "kind": "up-to-date",
        },
        "version": "1.0.0",
      },
    }
  `);
});
