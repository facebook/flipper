/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceOS} from 'flipper-common';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {ServerDevice} from './ServerDevice';

/**
 * Use this device when you do not have the actual uuid of the device.
 * For example, it is currently used in the case when, we do certificate
 * exchange through WWW mode.
 *
 * In this mode we do not know the device id of the app and we
 * generate a fake one.
 */
export default class DummyDevice extends ServerDevice {
  constructor(
    flipperServer: FlipperServerImpl,
    serial: string,
    title: string,
    os: DeviceOS,
  ) {
    super(flipperServer, {
      serial,
      deviceType: 'dummy',
      title,
      os,
      features: {
        screenCaptureAvailable: false,
        screenshotAvailable: false,
      },
    });
  }
}
