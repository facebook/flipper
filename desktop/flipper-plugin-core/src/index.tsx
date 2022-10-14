/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Dummy exports to support running plugin code in a headless context.
// We do not want to bundle real code that is going to be used in a browser context to decrease the bundle size.
// Yet some parts of the browser-only code is being evaluated at plugin import, not when it is being rendered.
// Expand the list of stubs as needed when we onboard more and more headless plugins
export const theme = {};
export const styled = () => () => ({});

export {produce, Draft} from 'immer';

import * as TestUtilites from './test-utils/test-utils';
export const TestUtils = TestUtilites;
export {StartPluginOptions as _StartPluginOptions} from './test-utils/test-utils';

import './plugin/PluginBase';

export {BasePluginInstance as _BasePluginInstance} from './plugin/PluginBase';
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
  _setAtomPersistentStorage,
  AtomPersistentStorage,
  Atom,
  isAtom,
  ReadOnlyAtom as _ReadOnlyAtom,
  AtomValue as _AtomValue,
} from './state/atom';
export {
  setBatchedUpdateImplementation as _setBatchedUpdateImplementation,
  batch,
} from './state/batch';
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
