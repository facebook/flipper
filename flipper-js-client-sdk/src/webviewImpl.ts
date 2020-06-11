/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperClient} from './api';

import type {FlipperPluginID, FlipperMethodID} from './api';

class FlipperWebviewClient extends FlipperClient {
  _subscriptions: Map<string, (message: any) => void> = new Map();
  _client: FlipperClient | null = null;

  start = (appName: string) => {
    const bridge = (window as any).FlipperWebviewBridge;
    bridge?.registerPlugins(this.plugins);
    bridge?.start(appName);
  };

  stop = () => {
    const bridge = (window as any).FlipperWebviewBridge;
    bridge?.FlipperWebviewBridge.stop();
  };

  sendData = (plugin: FlipperPluginID, method: FlipperMethodID, data: any) => {
    const bridge = (window as any).FlipperWebviewBridge;
    bridge && bridge.sendFlipperObject(plugin, method, JSON.stringify(data));
  };

  subscribe = (
    plugin: FlipperPluginID,
    method: FlipperMethodID,
    handler: (msg: any) => void,
  ) => {
    this._subscriptions.set(plugin + method, handler);
  };

  isAvailable = () => {
    return (window as any).FlipperWebviewBridge != null;
  };

  receive(plugin: FlipperPluginID, method: FlipperMethodID, data: string) {
    const handler = this._subscriptions.get(plugin + method);
    handler && handler(JSON.parse(data));
  }

  setClient(client: FlipperClient) {
    this._client = client;
  }
}

export function newWebviewClient(): FlipperClient {
  return new FlipperWebviewClient();
}
