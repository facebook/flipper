/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type FlipperPluginReceiverRes =
  | object
  | string
  | number
  | boolean
  | null
  | undefined
  | void;
export type FlipperPluginReceiver = (
  data: any,
) => FlipperPluginReceiverRes | Promise<FlipperPluginReceiverRes>;
export interface FlipperPluginConnection {
  /**
   * Send an `execute` message to Flipper.
   * Here is what client sends over the wire:
   * { method: 'execute', params: { api: pluginID, method, params } }
   *
   * @param method Method name that needs to be executed by Flipper
   * @param params Any extra params required for the method execution
   */
  send(method: string, params?: unknown): void;
  /**
   * Listen to messages for the method provided and execute a callback when one arrives.
   * Send response back to Flipper.
   * Read more about responses at https://fbflipper.com/docs/extending/new-clients#responding-to-messages
   *
   * @param method Method name that Flipper sent to the client
   * @param receiver A callback executed by the client when a message with the specified method arrives.
   * If this callback throws or returns a rejected Promise, client send an error message to Flipper.
   * If this callback returns any value (even undefined) synchronously, client sends it as a success message to Flipper.
   * If this callback returns a Promise, clients sends the value it is resolved with as a success message to Flipper.
   */
  receive(method: string, receiver: FlipperPluginReceiver): void;
}

// DOCS_FLIPPER_PLUGIN_START
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
  onConnect(connection: FlipperPluginConnection): void;

  /**
   * Called when the connection passed to `FlipperPlugin#onConnect(FlipperConnection)` is no
   * longer valid. Do not try to use the connection in or after this method has been called.
   */
  onDisconnect(): void;

  /**
   * Returns true if the plugin is meant to be run in background too, otherwise it returns false.
   */
  runInBackground?(): boolean;
}
// DOCS_FLIPPER_PLUGIN_END
