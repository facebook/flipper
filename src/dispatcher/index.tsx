/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import androidDevice from './androidDevice';
import metroDevice from './metroDevice';
import iOSDevice from './iOSDevice';
import desktopDevice from './desktopDevice';
import application from './application';
import tracking from './tracking';
import server from './server';
import notifications from './notifications';
import plugins from './plugins';
import user from './user';
import pluginManager from './pluginManager';

import {Logger} from '../fb-interfaces/Logger';
import {Store} from '../reducers/index';
import {Dispatcher} from './types';
import {notNull} from '../utils/typeUtils';

export default function(store: Store, logger: Logger): () => Promise<void> {
  const dispatchers: Array<Dispatcher> = [
    application,
    store.getState().settingsState.enableAndroid ? androidDevice : null,
    iOSDevice,
    metroDevice,
    desktopDevice,
    tracking,
    server,
    notifications,
    plugins,
    user,
    pluginManager,
  ].filter(notNull);
  const globalCleanup = dispatchers
    .map(dispatcher => dispatcher(store, logger))
    .filter(Boolean);
  return () => {
    return Promise.all(globalCleanup).then(() => {});
  };
}
