/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperClient, FlipperBridge} from './api';

import type {FlipperPluginID, FlipperMethodID} from './api';

class FlipperWebviewBridgeImpl extends FlipperBridge {
  _subscriptions: Map<string, (any) => void> = new Map();

  registerPlugins = (plugins: Array<FlipperPluginID>) => {
    window.FlipperWebviewBridge &&
      window.FlipperWebviewBridge.registerPlugins(plugins);
  };

  start = () => {
    window.FlipperWebviewBridge && window.FlipperWebviewBridge.start();
  };

  stop = () => {
    window.FlipperWebviewBridge && window.FlipperWebviewBridge.stop();
  };

  sendData = (plugin: FlipperPluginID, method: FlipperMethodID, data: any) => {
    window.FlipperWebviewBridge &&
      window.FlipperWebviewBridge.sendFlipperObject(
        plugin,
        method,
        JSON.stringify(data),
      );
  };

  subscribe = (
    plugin: FlipperPluginID,
    method: FlipperMethodID,
    handler: any => void,
  ) => {
    this._subscriptions.set(plugin + method, handler);
    window.FlipperWebviewBridge &&
      window.FlipperWebviewBridge.subscribe(plugin, method);
  };

  isAvailable = () => {
    return window.FlipperWebviewBridge != null;
  };

  handleMessage(plugin: FlipperPluginID, method: FlipperMethodID, data: any) {
    const handler: ?(any) => void = this._subscriptions.get(plugin + method);
    handler && handler(data);
  }
}

export function newWebviewClient(): FlipperClient {
  const bridge = new FlipperWebviewBridgeImpl();
  window.FlipperBridgeClientSide = bridge;
  return new FlipperClient(bridge);
}
