/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {DeviceLogListener} from './BaseDevice.js';
import BaseDevice from './BaseDevice.js';

export default class RemoteDevice extends BaseDevice {
  supportedPlugins = [];
  icon = 'icons/oculus.png';
  os = 'remote';

  constructor() {
    super('', 'physical', 'remote');

    console.log("RemoteDevice");
  }

  teardown() {}

  supportedColumns(): Array<string> {
    return [];
  }

  addLogListener(_callback: DeviceLogListener) {}

  supportsOS(os: string) {
    return os === 'remote';
  }
}
