/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type FlipperPluginID = string;

export type FlipperMethodID = string;

export class FlipperBridge {
  registerPlugins: (plugins: Array<FlipperPluginID>) => void;

  start: (appName: string) => void;

  stop: () => void;

  sendData: (
    plugin: FlipperPluginID,
    method: FlipperMethodID,
    data: any,
  ) => void;

  subscribe: (
    plugin: FlipperPluginID,
    method: FlipperMethodID,
    handler: (any) => void,
  ) => void;

  isAvailable: () => boolean;
}

export class FlipperResponder {
  pluginId: FlipperPluginID;
  methodId: FlipperMethodID;
  _bridge: FlipperBridge;

  constructor(
    pluginId: FlipperPluginID,
    methodId: FlipperMethodID,
    bridge: FlipperBridge,
  ) {
    this.pluginId = pluginId;
    this.methodId = methodId;
    this._bridge = bridge;
  }

  success(response: any) {}

  error(response: any) {}
}

export type FlipperReceiver<T> = (
  params: T,
  responder: FlipperResponder,
) => void;

export class FlipperConnection {
  pluginId: FlipperPluginID;
  _bridge: FlipperBridge;

  constructor(pluginId: FlipperPluginID, bridge: FlipperBridge) {
    this.pluginId = pluginId;
    this._bridge = bridge;
  }

  send(method: FlipperMethodID, data: any) {
    this._bridge.sendData(this.pluginId, method, data);
  }

  receive(method: FlipperMethodID, receiver: FlipperReceiver<*>) {
    this._bridge.subscribe(this.pluginId, method, (data) => {
      receiver(data, new FlipperResponder(this.pluginId, method, this._bridge));
    });
  }
}

export class FlipperPlugin {
  id: FlipperPluginID;
  _connection: ?FlipperConnection;

  onConnect(connection: FlipperConnection) {
    this._connection = connection;
  }
}

export class FlipperClient {
  _bridge: FlipperBridge;
  plugins: Map<FlipperPluginID, FlipperPlugin> = new Map();

  constructor(bridge: FlipperBridge) {
    this._bridge = bridge;
  }

  addPlugin(plugin: FlipperPlugin) {
    plugin.onConnect(new FlipperConnection(plugin.id, this._bridge));
    this.plugins.set(plugin.id, plugin);
  }

  getPlugin(id: FlipperPluginID): ?FlipperPlugin {
    return this.plugins.get(id);
  }

  start(appName: string) {
    this._bridge.registerPlugins([...this.plugins.keys()]);
    this._bridge.start(appName);
  }

  stop() {
    this._bridge.stop();
  }
}
