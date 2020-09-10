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
  messageID?: number;
  private client: FlipperClient;

  constructor(messageID: number, client: FlipperClient) {
    this.messageID = messageID;
    this.client = client;
  }

  success(response?: any) {
    this.client.sendData({ id: this.messageID, success: response });
  }

  error(response?: any) {
    this.client.sendData({ id: this.messageID, error: response });
  }
}

export type FlipperReceiver = (
  params: any,
  responder: FlipperResponder,
) => void;

export class FlipperConnection {
  pluginId: FlipperPluginID;
  private client: FlipperClient;
  private subscriptions: Map<FlipperMethodID, FlipperReceiver> = new Map();

  constructor(pluginId: FlipperPluginID, client: FlipperClient) {
    this.pluginId = pluginId;
    this.client = client;
  }

  send(method: FlipperMethodID, params: any) {
    this.client.sendData({
      method: 'execute',
      params: {
        api: this.pluginId,
        method,
        params,
      },
    });
  }

  receive(method: FlipperMethodID, receiver: FlipperReceiver) {
    this.subscriptions.set(method, receiver);
  }

  call(method: FlipperMethodID, params: any, responder: FlipperResponder) {
    const receiver = this.subscriptions.get(method);
    if (receiver == null) {
      const errorMessage = `Receiver ${method} not found.`;
      responder.error({ message: errorMessage });
      return;
    }
    receiver.call(receiver, params, responder);
  }

  hasReceiver(method: FlipperMethodID): boolean {
    return this.subscriptions.has(method);
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

export abstract class FlipperClient {
  private _isConnected: boolean = false;
  protected plugins: Map<FlipperPluginID, FlipperPlugin> = new Map();
  protected connections: Map<FlipperPluginID, FlipperConnection> = new Map();

  addPlugin(plugin: FlipperPlugin) {
    if (this._isConnected) {
      this.connectPlugin(plugin);
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
  }

  onDisconnect() {
    this._isConnected = false;
    for (const plugin of this.plugins.values()) {
      this.disconnectPlugin(plugin);
    }
  }

  abstract start(appName: string): void;

  abstract stop(): void;

  abstract sendData(payload: any): void;

  abstract isAvailable(): boolean;

  protected onMessageReceived(message: {
    method: string;
    id: number;
    params: any;
  }) {
    let responder: FlipperResponder | undefined;
    try {
      const { method, params, id } = message;
      responder = new FlipperResponder(id, this);

      if (method === 'getPlugins') {
        responder.success({ plugins: [...this.plugins.keys()] });
        return;
      }

      if (method === 'getBackgroundPlugins') {
        responder.success({
          plugins: [...this.plugins.keys()].filter((key) =>
            this.plugins.get(key)?.runInBackground(),
          ),
        });
        return;
      }

      if (method === 'init') {
        const identifier = params['plugin'] as string;
        const plugin = this.plugins.get(identifier);
        if (plugin == null) {
          const errorMessage = `Plugin ${identifier} not found for method ${method}`;
          responder.error({ message: errorMessage, name: 'PluginNotFound' });
          return;
        }

        this.connectPlugin(plugin);
        return;
      }

      if (method === 'deinit') {
        const identifier = params['plugin'] as string;
        const plugin = this.plugins.get(identifier);
        if (plugin == null) {
          const errorMessage = `Plugin ${identifier} not found for method ${method}`;
          responder.error({ message: errorMessage, name: 'PluginNotFound' });
          return;
        }

        this.disconnectPlugin(plugin);
        return;
      }

      if (method === 'execute') {
        const identifier = params['api'] as string;
        const connection = this.connections.get(identifier);
        if (connection == null) {
          const errorMessage = `Connection ${identifier} not found for plugin identifier`;

          responder.error({ message: errorMessage, name: 'ConnectionNotFound' });
          return;
        }

        connection.call(
          params['method'] as string,
          params['params'],
          responder,
        );
        return;
      }

      if (method === 'isMethodSupported') {
        const identifier = params['api'].getString();
        const connection = this.connections.get(identifier);
        if (connection == null) {
          const errorMessage = `Connection ${identifier} not found for plugin identifier`;

          responder.error({ message: errorMessage, name: 'ConnectionNotFound' });
          return;
        }
        const isSupported = connection.hasReceiver(
          params['method'].getString(),
        );
        responder.success({ isSupported: isSupported });
        return;
      }

      const response = { message: 'Received unknown method: ' + method };
      responder.error(response);
    } catch (e) {
      if (responder) {
        responder.error({
          message: 'Unknown error during ' + JSON.stringify(message),
          name: 'Unknown',
        });
      }
    }
  }

  private connectPlugin(plugin: FlipperPlugin): void {
    const id = plugin.getId();
    const connection = new FlipperConnection(id, this);
    plugin.onConnect(connection);
    this.connections.set(id, connection);
  }

  private disconnectPlugin(plugin: FlipperPlugin): void {
    const id = plugin.getId();
    plugin.onDisconnect();
    this.connections.delete(id);
  }
}
