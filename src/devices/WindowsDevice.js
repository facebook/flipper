/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import BaseDevice from './BaseDevice.js';

export default class WindowsDevice extends BaseDevice {
  supportedPlugins = [];
  icon = 'icons/oculus.png';
  os = 'windows';

  constructor() {
    super('', 'physical', 'desktop');
  }

  teardown() {}

  supportedColumns(): Array<string> {
    return [];
  }
}
