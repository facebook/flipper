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

let FlipperMainWindowId = 0;

ipcRenderer.on('parent-window-id', (event, message) => {
  FlipperMainWindowId = message;
});

let FlipperIsClientInit = false;
let FlipperMemoizedPlugins;

function initClient(plugins) {
  if (FlipperIsClientInit) {
    return;
  }
  if (plugins) {
    FlipperMemoizedPlugins = plugins;
  }
  if (FlipperMainWindowId != 0) {
    ipcRenderer.sendTo(FlipperMainWindowId, 'from-js-emulator-init-client', {
      command: 'initClient',
      windowId: remote.getCurrentWebContents().id,
      payload: {
        plugins: plugins ? plugins : FlipperMemoizedPlugins,
        appName: 'kite/weblite',
      },
    });
    FlipperIsClientInit = true;
  }
}

window.FlipperWebviewBridge = {
  registerPlugins: function(plugins) {
    console.log(plugins);
    if (FlipperMainWindowId != 0) {
      ipcRenderer.sendTo(FlipperMainWindowId, 'from-js-emulator', {
        command: 'registerPlugins',
        payload: plugins,
      });
    }
  },
  start: function() {
    console.log('start');

    if (FlipperMainWindowId != 0) {
      ipcRenderer.sendTo(FlipperMainWindowId, 'from-js-emulator', {
        command: 'start',
        payload: null,
      });
    }
  },
  sendFlipperObject: function(plugin, method, data) {
    console.log(plugin, method, data);
    initClient();
    if (FlipperMainWindowId != 0) {
      ipcRenderer.sendTo(FlipperMainWindowId, 'from-js-emulator', {
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
