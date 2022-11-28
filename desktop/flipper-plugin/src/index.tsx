/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {_setAtomPersistentStorage} from 'flipper-plugin-core';
_setAtomPersistentStorage(window.localStorage);

export * from 'flipper-plugin-core';

import styledImport from '@emotion/styled';
export const styled = styledImport;

import './state/batch';

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
export {MasterDetail} from './ui/MasterDetail';
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

export {DataTable, DataTableColumn} from './ui/data-table/DataTable';
export {DataTableManager} from './ui/data-table/DataTableManager';
export {DataList} from './ui/DataList';
export {Spinner} from './ui/Spinner';

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
export {useMemoize} from './utils/useMemoize';

export {createTablePlugin} from './utils/createTablePlugin';

export {textContent} from './utils/textContent';

// It's not ideal that this exists in flipper-plugin sources directly,
// but is the least pain for plugin authors.
// Probably we should make sure that testing-library doesn't end up in our final Flipper bundle (which packages flipper-plugin)
// T69106962
export const TestUtils = TestUtilites;
