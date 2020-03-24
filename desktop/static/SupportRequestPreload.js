/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {ipcRenderer} = require('electron');

global.sendToHost = (message) => {
  ipcRenderer.sendToHost(message);
};

global.setupToReceiveHostMessage = (callback) => {
  ipcRenderer.on('hostMessage', (event, message) => {
    callback(message);
  });
};
