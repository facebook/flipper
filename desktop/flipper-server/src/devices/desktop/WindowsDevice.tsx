/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServerImpl} from '../../FlipperServerImpl';
import {ServerDevice} from '../ServerDevice';

export default class WindowsDevice extends ServerDevice {
  constructor(flipperServer: FlipperServerImpl) {
    super(flipperServer, {
      serial: '',
      deviceType: 'physical',
      title: 'Windows',
      os: 'Windows',
      icon: 'app-microsoft-windows',
      features: {
        screenCaptureAvailable: false,
        screenshotAvailable: false,
      },
    });
  }
}
