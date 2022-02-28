/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlipperServer,
  FlipperServerCommands,
  FlipperServerEvents,
} from './server-types';

export interface ServerAddOnControls {
  start: FlipperServerCommands['plugins-server-add-on-start'];
  stop: FlipperServerCommands['plugins-server-add-on-stop'];
  sendMessage: (
    pluginName: string,
    method: string,
    params?: unknown,
  ) => Promise<object | string | number | boolean | null>;
}

// TODO: Share with js-flipper? Is it worth it?
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

export interface ServerAddOnPluginConnection {
  send(method: string, params: unknown): void;
  receive(method: string, receiver: FlipperPluginReceiver): void;
}

export interface FlipperServerForServerAddOn extends FlipperServer {
  emit(
    event: 'plugins-server-add-on-message',
    payload: FlipperServerEvents['plugins-server-add-on-message'],
  ): void;
}

export type ServerAddOnCleanup = () => Promise<void>;
export type ServerAddOn = (
  connection: ServerAddOnPluginConnection,
  {flipperServer}: {flipperServer: FlipperServerForServerAddOn},
) => Promise<ServerAddOnCleanup>;
