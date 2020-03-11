/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from './BaseDevice';

export default class JSDevice extends BaseDevice {
  webContentsId: number;

  constructor(serial: string, title: string, webContentsId: number) {
    super(serial, 'emulator', title, 'JSWebApp');
    this.devicePlugins = [];
    this.webContentsId = webContentsId;
  }
}
