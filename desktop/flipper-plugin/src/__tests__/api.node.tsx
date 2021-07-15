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
      "CodeBlock",
      "DataDescription",
      "DataFormatter",
      "DataInspector",
      "DataList",
      "DataSource",
      "DataTable",
      "DetailSidebar",
      "ElementsInspector",
      "Layout",
      "MarkerTimeline",
      "MasterDetail",
      "NUX",
      "Panel",
      "Tab",
      "Tabs",
      "TestUtils",
      "Toolbar",
      "Tracked",
      "TrackingScope",
      "batch",
      "createDataSource",
      "createState",
      "createTablePlugin",
      "getFlipperLib",
      "produce",
      "renderReactRoot",
      "sleep",
      "styled",
      "theme",
      "useLocalStorageState",
      "useLogger",
      "useMemoize",
      "usePlugin",
      "useTrackedCallback",
      "useValue",
      "withTrackingScope",
    ]
  `);

  expect(exposedTypes.sort()).toMatchInlineSnapshot(`
    Array [
      "Atom",
      "DataDescriptionType",
      "DataInspectorExpanded",
      "DataTableColumn",
      "DataTableManager",
      "DataValueExtractor",
      "DefaultKeyboardAction",
      "Device",
      "DeviceLogEntry",
      "DeviceLogListener",
      "DevicePluginClient",
      "DeviceType",
      "Draft",
      "ElementAttribute",
      "ElementData",
      "ElementExtraInfo",
      "ElementID",
      "ElementSearchResultSet",
      "ElementsInspectorElement",
      "ElementsInspectorProps",
      "FlipperLib",
      "HighlightManager",
      "Idler",
      "InteractionReport",
      "InteractionReporter",
      "LogLevel",
      "LogTypes",
      "Logger",
      "MenuEntry",
      "NormalizedMenuEntry",
      "Notification",
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
