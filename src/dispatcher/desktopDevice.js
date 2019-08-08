/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.tsx';
import type {Logger} from '../fb-interfaces/Logger.js';

import MacDevice from '../devices/MacDevice';
import WindowsDevice from '../devices/WindowsDevice';

export default (store: Store, logger: Logger) => {
  let device;
  if (process.platform === 'darwin') {
    device = new MacDevice();
  } else if (process.platform === 'win32') {
    device = new WindowsDevice();
  } else {
    return;
  }
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: device,
  });
};
