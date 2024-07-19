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
      "DataTableLegacy",
      "DetailSidebar",
      "Dialog",
      "ElementsInspector",
      "FileSelector",
      "HighlightContext",
      "HighlightProvider",
      "Layout",
      "MarkerTimeline",
      "MasterDetail",
      "MasterDetailLegacy",
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
      "batched",
      "createControlledPromise",
      "createDataSource",
      "createState",
      "createTablePlugin",
      "dataTablePowerSearchOperators",
      "getFlipperLib",
      "isAtom",
      "path",
      "produce",
      "renderReactRoot",
      "reportPluginFailures",
      "safeStringify",
      "sleep",
      "styled",
      "suggestNewPlugin",
      "textContent",
      "theme",
      "timeout",
      "tryCatchReportPluginFailures",
      "tryCatchReportPluginFailuresAsync",
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
      "CrashLog",
      "CrashLogListener",
      "CreatePasteArgs",
      "CreatePasteResult",
      "DataDescriptionType",
      "DataInspectorExpanded",
      "DataSourceVirtualizer",
      "DataTableColumn",
      "DataTableColumnLegacy",
      "DataTableManager",
      "DataTableManagerLegacy",
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
      "EnumLabels",
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
    `${__dirname}/../../../../docs/extending/flipper-plugin.mdx`,
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
        throw new Error(`Not documented: '${key}'`);
      }
    });
});
