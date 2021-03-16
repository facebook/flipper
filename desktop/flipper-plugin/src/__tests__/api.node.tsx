/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {readFile} from 'fs';
import {promisify} from 'util';
import * as FlipperPluginModule from '../index';

test('Correct top level API exposed', () => {
  const exposedAPIs: string[] = [];
  const exposedTypes: string[] = [];
  Object.entries(FlipperPluginModule).forEach(([key, value]) => {
    if (key[0] === '_') {
      return;
    }
    if (value === undefined) {
      exposedTypes.push(key);
    } else {
      exposedAPIs.push(key);
    }
  });

  // Note, all `exposedAPIs` should be documented in `flipper-plugin.mdx`
  expect(exposedAPIs.sort()).toMatchInlineSnapshot(`
    Array [
      "DataSource",
      "DataTable",
      "Layout",
      "NUX",
      "TestUtils",
      "Tracked",
      "TrackingScope",
      "batch",
      "createDataSource",
      "createState",
      "produce",
      "renderReactRoot",
      "sleep",
      "styled",
      "theme",
      "useLogger",
      "usePlugin",
      "useTrackedCallback",
      "useValue",
      "withTrackingScope",
    ]
  `);

  expect(exposedTypes.sort()).toMatchInlineSnapshot(`
    Array [
      "Atom",
      "DataTableColumn",
      "DefaultKeyboardAction",
      "Device",
      "DeviceLogEntry",
      "DeviceLogListener",
      "DevicePluginClient",
      "DeviceType",
      "Draft",
      "FlipperLib",
      "Idler",
      "LogLevel",
      "LogTypes",
      "Logger",
      "MenuEntry",
      "NormalizedMenuEntry",
      "PluginClient",
      "TrackType",
    ]
  `);
});

test('All APIs documented', async () => {
  const docs = await promisify(readFile)(
    __dirname + '/../../../../docs/extending/flipper-plugin.mdx',
    'utf8',
  );
  Object.keys(FlipperPluginModule)
    .filter(
      (key) =>
        !key.startsWith('_') && (FlipperPluginModule as any)[key] !== undefined,
    )
    .forEach((key) => {
      // There should be a header with this identifier
      if (!new RegExp(`# ${key}\\b`).test(docs)) {
        fail(`Not documented: '${key}'`);
      }
    });
});
