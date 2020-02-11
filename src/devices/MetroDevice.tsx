/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from './BaseDevice';
import ArchivedDevice from './ArchivedDevice';
import {v4} from 'uuid';

export default class MetroDevice extends BaseDevice {
  ws: WebSocket;

  constructor(serial: string, ws: WebSocket) {
    super(serial, 'emulator', 'React Native', 'Metro');
    this.ws = ws;
    this.devicePlugins = [];
  }

  archive() {
    return new ArchivedDevice(
      this.serial + v4(),
      this.deviceType,
      this.title,
      this.os,
      [...this.logEntries],
    );
  }
}
