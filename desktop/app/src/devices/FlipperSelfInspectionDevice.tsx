/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice, {OS, DeviceType} from './BaseDevice';

export default class FlipperSelfInspectionDevice extends BaseDevice {
  constructor(serial: string, deviceType: DeviceType, title: string, os: OS) {
    super(serial, deviceType, title, os);
    this.devicePlugins = [];
  }
}
