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
  let droppedFrames: number = 0;
  let largeFrameDrops: number = 0;
  function droppedFrameDetection(
    past: DOMHighResTimeStamp,
    isWindowFocused: () => boolean,
  ) {
    const now = performance.now();
    requestAnimationFrame(() => droppedFrameDetection(now, isWindowFocused));
    const dropped = Math.round((now - past) / (1000 / 60) - 1);
    if (!isWindowFocused() || dropped < 1) {
      return;
    }
    droppedFrames += dropped;
    if (dropped > 3) {
      largeFrameDrops++;
    }
  }

  droppedFrameDetection(
    performance.now(),
    () => store.getState().application.windowIsFocused,
  );

  ipcRenderer.on('trackUsage', () => {
    const {
      selectedDevice,
      selectedPlugin,
      selectedApp,
      clients,
    } = store.getState().connections;

    if (!selectedDevice || !selectedPlugin) {
      return;
    }
    const info = {
      droppedFrames,
      largeFrameDrops,
      os: selectedDevice.os,
      device: selectedDevice.title,
      plugin: selectedPlugin,
    };
    // reset dropped frames counter
    droppedFrames = 0;
    largeFrameDrops = 0;

    if (selectedApp) {
      const client = clients.find((c: Client) => c.id === selectedApp);
      if (client) {
        // $FlowFixMe
        info.app = client.query.app;
      }
    }

    logger.track('usage', 'ping', info);
  });
};
