/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice, {OS} from './BaseDevice';

/**
 * Use this device when you do not have the actual uuid of the device. For example, it is currently used in the case when, we do certificate exchange through WWW mode. In this mode we do not know the device id of the app and we generate a fake one.
 */
export default class DummyDevice extends BaseDevice {
  constructor(serial: string, title: string, os: OS) {
    super(serial, 'dummy', title, os);
    this.devicePlugins = [];
  }
}
