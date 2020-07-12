/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// ==============
// Preload script
// ==============
const {remote, ipcRenderer} = require('electron');

const flipperState = {
  mainWindowId: 0,
  isClientInit: false,
  plugins: null,
  appName: 'JS App',
};

ipcRenderer.on('parent-window-id', (event, message) => {
  flipperState.mainWindowId = message;
});

function cleanUpGWTArray(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    res.push(arr[i]);
  }
  return res;
}

function initClient(plugins, appName) {
  if (flipperState.isClientInit) {
    return;
  }
  if (plugins) {
    flipperState.plugins = cleanUpGWTArray(plugins);
  }
  if (appName) {
    flipperState.appName = appName;
  }
  if (flipperState.mainWindowId != 0) {
    ipcRenderer.sendTo(
      flipperState.mainWindowId,
      'from-js-emulator-init-client',
      {
        command: 'initClient',
        windowId: remote.getCurrentWebContents().id,
        payload: {
          plugins: flipperState.plugins,
          appName: flipperState.appName,
        },
      },
    );
    flipperState.isClientInit = true;
  }
}

window.FlipperWebviewBridge = {
  registerPlugins: function (plugins) {
    flipperState.plugins = plugins;
  },
  start: function (appName) {
    flipperState.appName = appName;
    initClient();
  },
  sendFlipperObject: function (plugin, method, data) {
    initClient();
    if (flipperState.mainWindowId != 0) {
      ipcRenderer.sendTo(flipperState.mainWindowId, 'from-js-emulator', {
        command: 'sendFlipperObject',
        payload: {
          api: plugin,
          method: method,
          params: data,
        },
      });
    }
  },
  isFlipperSupported: true,
  initClient: initClient,
};

ipcRenderer.on('message-to-plugin', (event, message) => {
  const flipper = window.flipper;
  if (!flipper) {
    return;
  }
  const receiver = flipper.FlipperWebviewMessageReceiver.receive;
  const {api, method, params} = message.params;
  receiver(api, method, JSON.stringify(params));
});
