/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type {Logger} from '../fb-interfaces/Logger.js';

import WindowsDevice from '../devices/WindowsDevice';

export default (store: Store, logger: Logger) => {
  if (process.platform !== 'win32') {
    return;
  }
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: new WindowsDevice(),
  });
};
