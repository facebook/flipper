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

export default class MacDevice extends ServerDevice {
  constructor(flipperServer: FlipperServerImpl) {
    super(flipperServer, {
      serial: '',
      deviceType: 'physical',
      title: 'Mac',
      os: 'MacOS',
      icon: 'app-apple',
      features: {
        screenCaptureAvailable: false,
        screenshotAvailable: false,
      },
    });
  }
}
