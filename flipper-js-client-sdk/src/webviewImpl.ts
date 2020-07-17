/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperClient} from './api';

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

  sendData = (data: any) => {
    const bridge = (window as any).FlipperWebviewBridge;
    bridge && bridge.sendFlipperObject(data);
  };

  isAvailable = () => {
    return (window as any).FlipperWebviewBridge != null;
  };
}

export function newWebviewClient(): FlipperClient {
  return new FlipperWebviewClient();
}
