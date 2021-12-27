/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import MacDevice from './MacDevice';
import WindowsDevice from './WindowsDevice';
import {FlipperServerImpl} from '../../FlipperServerImpl';

export default (flipperServer: FlipperServerImpl) => {
  let device;
  if (process.platform === 'darwin') {
    device = new MacDevice(flipperServer);
  } else if (process.platform === 'win32') {
    device = new WindowsDevice(flipperServer);
  } else {
    return;
  }
  flipperServer.registerDevice(device);
};
