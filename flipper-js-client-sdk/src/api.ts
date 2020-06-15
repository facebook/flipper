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

export class FlipperResponder {
  pluginId: FlipperPluginID;
  methodId: FlipperMethodID;
  private _client: FlipperClient;

  constructor(
    pluginId: FlipperPluginID,
    methodId: FlipperMethodID,
    client: FlipperClient
  ) {
    this.pluginId = pluginId;
    this.methodId = methodId;
    this._client = client;
  }

  success(_response: any) {}

  error(_response: any) {}
}

export type FlipperReceiver<T> = (
  params: T,
  responder: FlipperResponder,
) => void;

export class FlipperConnection {
  pluginId: FlipperPluginID;
  private client: FlipperClient;

  constructor(pluginId: FlipperPluginID, client: FlipperClient) {
    this.pluginId = pluginId;
    this.client = client;
  }

  send(method: FlipperMethodID, data: any) {
    this.client.sendData(this.pluginId, method, data);
  }

  receive<T>(method: FlipperMethodID, receiver: FlipperReceiver<T>) {
    this.client.subscribe(this.pluginId, method, (data: T) => {
      receiver(data, new FlipperResponder(this.pluginId, method, this.client));
    });
  }
}

export interface FlipperPlugin {
  /**
   * @return The id of this plugin. This is the namespace which Flipper desktop plugins will call
   *     methods on to route them to your plugin. This should match the id specified in your React
   *     plugin.
   */
  getId(): string;

  /**
   * Called when a connection has been established. The connection passed to this method is valid
   * until {@link FlipperPlugin#onDisconnect()} is called.
   */
  onConnect(connection: FlipperConnection): void;

  /**
   * Called when the connection passed to `FlipperPlugin#onConnect(FlipperConnection)` is no
   * longer valid. Do not try to use the connection in or after this method has been called.
   */
  onDisconnect(): void;

  /**
   * Returns true if the plugin is meant to be run in background too, otherwise it returns false.
   */
  runInBackground(): boolean;
}

export abstract class AbstractFlipperPlugin implements FlipperPlugin{
  protected connection: FlipperConnection | null | undefined;

  onConnect(connection: FlipperConnection): void {
    this.connection = connection;
  }
  onDisconnect(): void {
    this.connection = null;
  }

  abstract getId(): string;
  abstract runInBackground(): boolean;

}

export abstract class FlipperClient {
  _isConnected: boolean = false;
  plugins: Map<FlipperPluginID, FlipperPlugin> = new Map();

  addPlugin(plugin: FlipperPlugin) {
    if (this._isConnected) {
      plugin.onConnect(new FlipperConnection(plugin.getId(), this));
    }
    this.plugins.set(plugin.getId(), plugin);
  }

  getPlugin(id: FlipperPluginID): FlipperPlugin | undefined {
    return this.plugins.get(id);
  }

  onConnect() {
    if (this._isConnected) {
      return;
    }
    this._isConnected = true;
    Array.from(this.plugins.values()).map((plugin) =>
      plugin.onConnect(new FlipperConnection(plugin.getId(), this)),
    );
  }

  onDisconnect() {
    this._isConnected = false;
    Array.from(this.plugins.values()).map((plugin) => plugin.onDisconnect());
  }

  abstract start: (appName: string) => void;

  abstract stop: () => void;

  abstract sendData: (
    plugin: FlipperPluginID,
    method: FlipperMethodID,
    data: any,
  ) => void;

  abstract subscribe: <T>(
    plugin: FlipperPluginID,
    method: FlipperMethodID,
    handler: (message: T) => void,
  ) => void;

  abstract isAvailable: () => boolean;
}
