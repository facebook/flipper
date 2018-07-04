/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {ipcRenderer} from 'electron';

import type BaseDevice from '../devices/BaseDevice.js';
import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';

export default (store: Store, logger: Logger) => {
  ipcRenderer.on('trackUsage', () => {
    const {
      devices,
      selectedDeviceIndex,
      selectedPlugin,
      selectedApp,
    } = store.getState().connections;

    const device: ?BaseDevice =
      selectedDeviceIndex > -1 ? devices[selectedDeviceIndex] : null;
    console.log(1, 2, 3);
    if (!device || !selectedPlugin) {
      return;
    }
    if (selectedApp) {
      logger.track('usage', 'ping', {
        app: selectedApp,
        device,
        os: device.os,
        plugin: selectedPlugin,
      });
    } else {
      logger.track('usage', 'ping', {
        os: device.os,
        plugin: selectedPlugin,
        device: device.title,
      });
    }
  });
};
