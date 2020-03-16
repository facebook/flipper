/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare namespace Flipper {
  /**
   * A FlipperPlugin is an object which exposes an API to the Desktop Flipper application. When a
   * connection is established the plugin is given a FlipperConnection on which it can register
   * request handlers and send messages. When the FlipperConnection is invalid onDisconnect is called.
   * onConnect may be called again on the same plugin object if Flipper re-connects, this will provide
   * a new FlipperConnection, do not attempt to re-use the previous connection.
   */
  interface FlipperPlugin {
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

  export interface FlipperResponder {
    success(response?: any): void;
    error(response: any): void;
  }

  export interface FlipperConnection {
    send(method: string, data: any): void;
    reportErrorWithMetadata(reason: string, stackTrace: string): void;
    reportError(error: Error): void;
    receive(
      method: string,
      listener: (params: any, responder: FlipperResponder) => void,
    ): void;
  }
}

/**
 * Internal api to connect to the native Java module, not to be used directly
 */
declare module 'Flipper' {
  export function registerPlugin(
    pluginId: string,
    runInBackground: boolean,
    statusCallback: (status: 'noflipper' | 'ok') => void,
  ): void;
  export function send(pluginId: string, method: string, data: string): void;
  export function reportErrorWithMetadata(
    pluginId: string,
    reason: string,
    stackTrace: string,
  ): void;
  export function reportError(pluginId: string, error: string): void;
  export function subscribe(pluginId: string, method: string): void;
  export function respondSuccess(responderId: string, data?: string): void;
  export function respondError(responderId: string, error: string): void;
}

/**
 * Register a new plugin
 * @param plugin
 */
export function addPlugin(plugin: Flipper.FlipperPlugin): void;
