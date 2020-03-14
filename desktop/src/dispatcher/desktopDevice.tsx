/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';

import MacDevice from '../devices/MacDevice';
import WindowsDevice from '../devices/WindowsDevice';

export default (store: Store, _logger: Logger) => {
  let device;
  if (process.platform === 'darwin') {
    device = new MacDevice();
  } else if (process.platform === 'win32') {
    device = new WindowsDevice();
  } else {
    return;
  }
  device.loadDevicePlugins(store.getState().plugins.devicePlugins);
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: device,
  });
};
