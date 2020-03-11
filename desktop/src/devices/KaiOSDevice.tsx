/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import AndroidDevice from './AndroidDevice';

export default class KaiOSDevice extends AndroidDevice {
  async screenCaptureAvailable() {
    // The default way of capturing screenshots through adb does not seem to work
    // There is a way of getting a screenshot through KaiOS dev tools though
    return false;
  }
}
