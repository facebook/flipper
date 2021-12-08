/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceOS, DeviceType} from 'flipper-plugin';
import {DeviceSpec} from 'flipper-plugin-lib';
import BaseDevice from '../devices/BaseDevice';

export class TestDevice extends BaseDevice {
  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    os: DeviceOS,
    specs?: DeviceSpec[],
  ) {
    super(
      {
        async start() {},
        on: jest.fn(),
        off: jest.fn(),
        exec: jest.fn(),
        close: jest.fn(),
      },
      {
        serial,
        deviceType,
        title,
        os,
        specs,
      },
    );
  }
}
