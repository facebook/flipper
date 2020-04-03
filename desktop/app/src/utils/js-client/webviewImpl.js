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

  start = (appName: string) => {
    window.FlipperWebviewBridge && window.FlipperWebviewBridge.start(appName);
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
    handler: (any) => void,
  ) => {
    this._subscriptions.set(plugin + method, handler);
  };

  isAvailable = () => {
    return window.FlipperWebviewBridge != null;
  };

  receive(plugin: FlipperPluginID, method: FlipperMethodID, data: string) {
    const handler = this._subscriptions.get(plugin + method);
    handler && handler(JSON.parse(data));
  }
}

export function newWebviewClient(): FlipperClient {
  const bridge = new FlipperWebviewBridgeImpl();
  window.flipper = {
    FlipperWebviewMessageReceiver: bridge,
  };
  return new FlipperClient(bridge);
}
