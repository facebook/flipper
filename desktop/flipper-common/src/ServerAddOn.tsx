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

export type ServerAddOnStartDetails =
  | {isBundled: true; path?: never}
  | {isBundled?: false; path: string};

export interface ServerAddOnControls {
  start: FlipperServerCommands['plugins-server-add-on-start'];
  stop: FlipperServerCommands['plugins-server-add-on-stop'];
  sendMessage: (
    pluginName: string,
    method: string,
    params?: unknown,
  ) => Promise<object | string | number | boolean | null>;
  receiveMessage: (
    pluginName: string,
    method: string,
    receiver: (data: unknown) => void,
  ) => void;
  receiveAnyMessage: (
    pluginName: string,
    receiver: (method: string, data: unknown) => void,
  ) => void;
  unsubscribePlugin: (pluginName: string) => void;
  unsubscribe: () => void;
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

export type FlipperPluginReceiver<T> = (
  data: T,
) => FlipperPluginReceiverRes | Promise<FlipperPluginReceiverRes>;

export type EventsContract = Record<string, any>;
export type MethodsContract = Record<string, (params: any) => Promise<any>>;

export interface ServerAddOnPluginConnection<
  Events extends EventsContract,
  Methods extends MethodsContract,
> {
  send<T extends keyof Events & string>(
    method: T,
    ...params: Events[T] extends never ? [] : [Events[T]]
  ): void;
  receive<T extends keyof Methods & string>(
    method: T,
    receiver: FlipperPluginReceiver<Parameters<Methods[T]>[0]>,
  ): void;
}

export interface FlipperServerForServerAddOn extends FlipperServer {
  emit(
    event: 'plugins-server-add-on-message',
    payload: FlipperServerEvents['plugins-server-add-on-message'],
  ): void;
}

export type ServerAddOnCleanup = () => Promise<void>;

export type ServerAddOnExtras = {
  flipperServer: FlipperServerForServerAddOn;
};

export type ServerAddOn<
  Events extends EventsContract,
  Methods extends MethodsContract,
> = (
  connection: ServerAddOnPluginConnection<Events, Methods>,
  extras: ServerAddOnExtras,
) => Promise<ServerAddOnCleanup>;
