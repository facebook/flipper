/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
    [
      "CodeBlock",
      "DataDescription",
      "DataFormatter",
      "DataInspector",
      "DataList",
      "DataSource",
      "DataTable",
      "DetailSidebar",
      "Dialog",
      "ElementsInspector",
      "FileSelector",
      "HighlightContext",
      "HighlightProvider",
      "Layout",
      "MarkerTimeline",
      "MasterDetail",
      "NUX",
      "Panel",
      "PowerSearch",
      "Spinner",
      "Tab",
      "Tabs",
      "TestUtils",
      "TimelineDataDescription",
      "Toolbar",
      "Tracked",
      "TrackingScope",
      "batch",
      "createControlledPromise",
      "createDataSource",
      "createState",
      "createTablePlugin",
      "getFlipperLib",
      "isAtom",
      "path",
      "produce",
      "renderReactRoot",
      "safeStringify",
      "sleep",
      "styled",
      "suggestNewPlugin",
      "textContent",
      "theme",
      "timeout",
      "useHighlighter",
      "useLocalStorageState",
      "useLogger",
      "useMemoize",
      "usePlugin",
      "useTrackedCallback",
      "useValue",
      "uuid",
      "withTrackingScope",
    ]
  `);

  expect(exposedTypes.sort()).toMatchInlineSnapshot(`
    [
      "Atom",
      "AtomPersistentStorage",
      "CrashLog",
      "CrashLogListener",
      "CreatePasteArgs",
      "CreatePasteResult",
      "DataDescriptionType",
      "DataInspectorExpanded",
      "DataSourceVirtualizer",
      "DataTableColumn",
      "DataTableManager",
      "DataValueExtractor",
      "DefaultKeyboardAction",
      "Device",
      "DeviceLogEntry",
      "DeviceLogLevel",
      "DeviceLogListener",
      "DeviceOS",
      "DevicePluginClient",
      "DeviceType",
      "DialogResult",
      "DownloadFileResponse",
      "Draft",
      "ElementAttribute",
      "ElementData",
      "ElementExtraInfo",
      "ElementID",
      "ElementSearchResultSet",
      "ElementsInspectorElement",
      "ElementsInspectorProps",
      "FieldConfig",
      "FileDescriptor",
      "FileEncoding",
      "FlipperLib",
      "FlipperPluginInstance",
      "FlipperServerForServerAddOn",
      "HighlightManager",
      "Idler",
      "InteractionReport",
      "InteractionReporter",
      "Logger",
      "MenuEntry",
      "NormalizedMenuEntry",
      "Notification",
      "OperatorConfig",
      "PluginClient",
      "PowerSearchConfig",
      "RemoteServerContext",
      "SearchExpressionTerm",
      "ServerAddOn",
      "ServerAddOnPluginConnection",
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
