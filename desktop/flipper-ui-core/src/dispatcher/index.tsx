/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Used responsibly.
import application from './application';
import tracking from './tracking';
import notifications from './notifications';
import plugins from './plugins';
import user from './fb-stubs/user';
import pluginManager from './pluginManager';
import reactNative from './reactNative';
import pluginMarketplace from './pluginMarketplace';
import pluginDownloads from './pluginDownloads';
import info from '../utils/info';
import pluginChangeListener from './pluginsChangeListener';

import {Logger} from 'flipper-common';
import {Store} from '../reducers/index';
import {Dispatcher} from './types';
import {notNull} from '../utils/typeUtils';

export default function (store: Store, logger: Logger): () => Promise<void> {
  // This only runs in development as when the reload
  // kicks in it doesn't unregister the shortcuts
  const dispatchers: Array<Dispatcher> = [
    application,
    tracking,
    notifications,
    plugins,
    user,
    pluginManager,
    reactNative,
    pluginMarketplace,
    pluginDownloads,
    info,
    pluginChangeListener,
  ].filter(notNull);
  const globalCleanup = dispatchers
    .map((dispatcher) => dispatcher(store, logger))
    .filter(Boolean);
  return () => {
    return Promise.all(globalCleanup).then(() => {});
  };
}
