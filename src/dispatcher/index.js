/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import androidDevice from './androidDevice.tsx';
import iOSDevice from './iOSDevice';
import desktopDevice from './desktopDevice.tsx';
import application from './application.tsx';
import tracking from './tracking.tsx';
import server from './server.tsx';
import notifications from './notifications';
import plugins from './plugins';
import user from './user.tsx';

import type {Logger} from '../fb-interfaces/Logger.js';
import type {Store} from '../reducers/index.tsx';
import type {Dispatcher} from './types.tsx';

export default function(store: Store, logger: Logger): () => Promise<void> {
  const dispatchers: Array<Dispatcher> = [
    application,
    androidDevice,
    iOSDevice,
    desktopDevice,
    tracking,
    server,
    notifications,
    plugins,
    user,
  ];
  const globalCleanup = dispatchers
    .map(dispatcher => dispatcher(store, logger))
    .filter(Boolean);
  return () => {
    return Promise.all(globalCleanup).then(() => {});
  };
}
