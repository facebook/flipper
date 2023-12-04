/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {DeviceOS, DeviceType} from 'flipper-plugin';
import {DeviceSpec} from 'flipper-common';
import BaseDevice from './BaseDevice';
import {getRenderHostInstance} from '../RenderHost';

export class TestDevice extends BaseDevice {
  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    os: DeviceOS,
    specs?: DeviceSpec[],
  ) {
    super(getRenderHostInstance().flipperServer, {
      serial,
      deviceType,
      title,
      os,
      specs,
      features: {
        screenCaptureAvailable: false,
        screenshotAvailable: false,
      },
    });
  }

  async startLogging() {
    // noop
  }
}
