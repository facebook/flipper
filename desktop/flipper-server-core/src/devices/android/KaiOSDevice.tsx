/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceType} from 'flipper-common';
import AndroidDevice from './AndroidDevice';
import {DeviceClient} from '@u4/adbkit';
import {FlipperServerImpl} from '../../FlipperServerImpl';

export default class KaiOSDevice extends AndroidDevice {
  constructor(
    flipperServer: FlipperServerImpl,
    serial: string,
    deviceType: DeviceType,
    title: string,
    adb: DeviceClient,
    abiList: Array<string>,
    sdkVersion: string,
  ) {
    super(flipperServer, serial, deviceType, title, adb, abiList, sdkVersion, [
      'KaiOS',
    ]);
  }
}
