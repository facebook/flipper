/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'events';
import {
  ResponseMessage,
  ClientErrorType,
  ExecuteMessage,
  ServerAddOnPluginConnection,
  FlipperPluginReceiver,
} from 'flipper-common';
import {safeJSONStringify} from '../utils/safeJSONStringify';

export type ServerAddOnModuleToDesktopConnectionEvents = {
  message: ExecuteMessage;
};

export class ServerAddOnModuleToDesktopConnection
  extends EventEmitter
  implements ServerAddOnPluginConnection<any, any>
{
  private subscriptions: Map<string, FlipperPluginReceiver<any>> = new Map();

  constructor(private readonly pluginName: string) {
    super();
  }

  send(method: string, params: unknown) {
    const event = 'message';
    const message: ServerAddOnModuleToDesktopConnectionEvents[typeof event] = {
      method: 'execute',
      params: {
        method,
        params,
        api: this.pluginName,
      },
    };
    this.emit('message', message);
  }

  receive(method: string, receiver: FlipperPluginReceiver<any>) {
    this.subscriptions.set(method, receiver);
  }

  async call(method: string, params: unknown): Promise<ResponseMessage> {
    try {
      const receiver = this.subscriptions.get(method);
      if (!receiver) {
        throw new Error(`Receiver ${method} not found.`);
      }
      const response = await receiver.call(receiver, params);
      return {
        id: 0, // Not used in server <-> desktop connections. Used only in server <-> client connections.
        success: response == null ? null : response,
      };
    } catch (e) {
      const errorMessage: ClientErrorType =
        e instanceof Error
          ? {name: e.name, message: e.message, stacktrace: e.stack ?? ''}
          : {name: 'Unknown', message: safeJSONStringify(e), stacktrace: ''};
      return {
        id: 0, // Not used in server <-> desktop connections. Used only in server <-> client connections.
        error: errorMessage,
      };
    }
  }
}
