/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {ipcRenderer} from 'electron';

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';

export default (store: Store, logger: Logger) => {
  ipcRenderer.on('trackUsage', () => {
    const {
      selectedDevice,
      selectedPlugin,
      selectedApp,
    } = store.getState().connections;

    if (!selectedDevice || !selectedPlugin) {
      return;
    }
    if (selectedApp) {
      logger.track('usage', 'ping', {
        app: selectedApp,
        device: selectedDevice,
        os: selectedDevice.os,
        plugin: selectedPlugin,
      });
    } else {
      logger.track('usage', 'ping', {
        os: selectedDevice.os,
        plugin: selectedPlugin,
        device: selectedDevice.title,
      });
    }
  });
};
