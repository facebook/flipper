/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import MacDevice from './MacDevice';
import WindowsDevice from './WindowsDevice';
import {FlipperServer} from '../../FlipperServer';

export default (flipperServer: FlipperServer) => {
  let device;
  if (process.platform === 'darwin') {
    device = new MacDevice();
  } else if (process.platform === 'win32') {
    device = new WindowsDevice();
  } else {
    return;
  }
  flipperServer.registerDevice(device);
};
