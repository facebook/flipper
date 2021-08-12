/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceType} from 'flipper-plugin-lib';
import AndroidDevice from './AndroidDevice';
import {Client as ADBClient} from 'adbkit';

export default class KaiOSDevice extends AndroidDevice {
  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    adb: ADBClient,
    abiList: Array<string>,
    sdkVersion: string,
  ) {
    super(serial, deviceType, title, adb, abiList, sdkVersion, ['KaiOS']);
  }

  async screenCaptureAvailable() {
    // The default way of capturing screenshots through adb does not seem to work
    // There is a way of getting a screenshot through KaiOS dev tools though
    return false;
  }
}
