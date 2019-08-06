/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import BaseDevice from './BaseDevice.tsx';

export default class MacDevice extends BaseDevice {
  os = 'MacOS';

  constructor() {
    super('', 'physical', 'Mac');
  }

  teardown() {}

  supportedColumns(): Array<string> {
    return [];
  }
}
