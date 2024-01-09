/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styledImport from '@emotion/styled';
export const styled = styledImport;

export {useValue} from './state/atom';

import * as TestUtilites from './test-utils/test-utils';

export {SandyPluginRenderer as _SandyPluginRenderer} from './plugin/PluginRenderer';
export {
  SandyPluginContext as _SandyPluginContext,
  usePlugin,
} from './plugin/PluginContext';

export {theme} from './ui/theme';
export {Layout} from './ui/Layout';
export {
  NUX,
  NuxManagerContext as _NuxManagerContext,
  createNuxManager as _createNuxManager,
} from './ui/NUX';
export {Sidebar as _Sidebar} from './ui/Sidebar';
export {DetailSidebar} from './ui/DetailSidebar';
export {Toolbar} from './ui/Toolbar';

export {MasterDetailWithPowerSearch as MasterDetail} from './ui/MasterDetailWithPowerSearch';
export {MasterDetailWithPowerSearch as _MasterDetailWithPowerSearch} from './ui/MasterDetailWithPowerSearch';
export {MasterDetail as MasterDetailLegacy} from './ui/MasterDetail';
export {CodeBlock} from './ui/CodeBlock';

export {renderReactRoot, _PortalsManager} from './utils/renderReactRoot';
export {
  Tracked,
  TrackingScope,
  setGlobalInteractionReporter as _setGlobalInteractionReporter,
  withTrackingScope,
  useTrackedCallback,
  wrapInteractionHandler as _wrapInteractionHandler,
  InteractionReport,
  InteractionReporter,
} from './ui/Tracked';

export {DataFormatter} from './ui/DataFormatter';

export {useLogger, _LoggerContext} from './utils/useLogger';

export {
  DataTable,
  DataTableColumn,
} from './ui/data-table/DataTableWithPowerSearch';
export {
  DataTable as _DataTableWithPowerSearch,
  DataTableColumn as _DataTableColumnWithPowerSearch,
} from './ui/data-table/DataTableWithPowerSearch';
export {
  DataTable as DataTableLegacy,
  DataTableColumn as DataTableColumnLegacy,
} from './ui/data-table/DataTable';
export {DataTableManager} from './ui/data-table/DataTableWithPowerSearchManager';
export {DataTableManager as _DataTableWithPowerSearchManager} from './ui/data-table/DataTableWithPowerSearchManager';
export {DataTableManager as DataTableManagerLegacy} from './ui/data-table/DataTableManager';
export {dataTablePowerSearchOperators} from './ui/data-table/DataTableDefaultPowerSearchOperators';
export {DataList} from './ui/DataList';
export {Spinner} from './ui/Spinner';
export * from './ui/PowerSearch';

export {DataSourceVirtualizer} from './data-source/DataSourceRendererVirtual';

export {
  Interactive as _Interactive,
  InteractiveProps as _InteractiveProps,
} from './ui/Interactive';
export {Panel} from './ui/Panel';
export {Tabs, Tab} from './ui/Tabs';
export {useLocalStorageState} from './utils/useLocalStorageState';

export {FileSelector} from './ui/FileSelector';
export {
  HighlightManager,
  HighlightContext,
  HighlightProvider,
  useHighlighter,
} from './ui/Highlight';
export {
  DataValueExtractor,
  DataInspectorExpanded,
} from './ui/data-inspector/DataInspectorNode';
export {
  DataDescriptionType,
  DataDescription,
} from './ui/data-inspector/DataDescription';
export {MarkerTimeline} from './ui/MarkerTimeline';
export {DataInspector} from './ui/data-inspector/DataInspector';
export {TimelineDataDescription} from './ui/data-inspector/TimelineDataDescription';
export {Dialog, DialogResult} from './ui/Dialog';
export {
  ElementsInspector,
  Element as ElementsInspectorElement,
  // TODO: clean up or create namespace
  ElementsInspectorProps,
  ElementExtraInfo,
  ElementAttribute,
  ElementData,
  ElementSearchResultSet,
  ElementID,
} from './ui/elements-inspector/ElementsInspector';
export {suggestNewPlugin} from './ui/SuggestNewPlugin';
export {useMemoize} from './utils/useMemoize';

export {createTablePlugin} from './utils/createTablePlugin';

export {textContent} from './utils/textContent';

// It's not ideal that this exists in flipper-plugin sources directly,
// but is the least pain for plugin authors.
// Probably we should make sure that testing-library doesn't end up in our final Flipper bundle (which packages flipper-plugin)
// T69106962
export const TestUtils = TestUtilites;

export {produce, Draft} from 'immer';

export {
  SandyPluginInstance as _SandyPluginInstance,
  PluginClient,
  PluginFactory as _PluginFactory,
  RealFlipperClient as _RealFlipperClient,
} from './plugin/Plugin';
export {
  Device,
  DeviceLogListener,
  DevicePluginClient,
  CrashLogListener,
  SandyDevicePluginInstance as _SandyDevicePluginInstance,
  DevicePluginFactory as _DevicePluginFactory,
} from './plugin/DevicePlugin';
export {
  SandyPluginDefinition as _SandyPluginDefinition,
  FlipperPluginInstance,
  FlipperPluginModule as _FlipperPluginModule,
  FlipperDevicePluginModule as _FlipperDevicePluginModule,
} from './plugin/SandyPluginDefinition';

export {
  DataSource,
  DataSourceView as _DataSourceView,
  DataSourceOptionKey as _DataSourceOptionKey,
  DataSourceOptions as _DataSourceOptions,
} from './data-source/DataSource';
export {createDataSource} from './state/createDataSource';

export {
  createState,
  Atom,
  isAtom,
  ReadOnlyAtom as _ReadOnlyAtom,
  AtomValue as _AtomValue,
} from './state/atom';
export {batched, batch} from './state/batch';
export {
  FlipperLib,
  getFlipperLib,
  setFlipperLibImplementation as _setFlipperLibImplementation,
  tryGetFlipperLibImplementation as _tryGetFlipperLibImplementation,
  FileDescriptor,
  FileEncoding,
  RemoteServerContext,
  DownloadFileResponse,
} from './plugin/FlipperLib';
export {
  MenuEntry,
  NormalizedMenuEntry,
  buildInMenuEntries as _buildInMenuEntries,
  DefaultKeyboardAction,
} from './plugin/MenuEntry';
export {Notification} from './plugin/Notification';
export {CreatePasteArgs, CreatePasteResult} from './plugin/Paste';

export {Idler} from './utils/Idler';

export {
  makeShallowSerializable as _makeShallowSerializable,
  deserializeShallowObject as _deserializeShallowObject,
} from './utils/shallowSerialization';

import * as path from './utils/path';
export {path};
export {safeStringify} from './utils/safeStringify';
export {stubLogger as _stubLogger} from './utils/Logger';

export {
  sleep,
  timeout,
  createControlledPromise,
  uuid,
  reportPluginFailures,
  tryCatchReportPluginFailures,
  tryCatchReportPluginFailuresAsync,
  DeviceOS,
  DeviceType,
  DeviceLogEntry,
  DeviceLogLevel,
  Logger,
  CrashLog,
  ServerAddOn,
  ServerAddOnPluginConnection,
  FlipperServerForServerAddOn,
} from 'flipper-common';
