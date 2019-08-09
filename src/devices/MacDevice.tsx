/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import BaseDevice from './BaseDevice';

export default class MacDevice extends BaseDevice {
  constructor() {
    super('', 'physical', 'Mac');
    this.os = 'MacOS';
  }

  teardown() {}

  supportedColumns(): Array<string> {
    return [];
  }
}
