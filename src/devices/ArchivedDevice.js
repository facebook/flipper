/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import BaseDevice from './BaseDevice.js';
import type {DeviceType, OS, DeviceShell} from './BaseDevice.js';

export default class ArchivedDevice extends BaseDevice {
  constructor(serial: string, deviceType: DeviceType, title: string, os: OS) {
    super(serial, deviceType, title);
    this.os = os;
  }

  getLogs() {
    return [];
  }

  spawnShell(): ?DeviceShell {
    return null;
  }
}
