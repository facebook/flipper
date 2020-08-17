/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice, {OS} from './BaseDevice';

export default class ClientDevice extends BaseDevice {
  constructor(serial: string, title: string, os: OS) {
    super(serial, 'emulator', title, os);
    this.devicePlugins = [];
  }
}
