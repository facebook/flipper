/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ResponseMessage, ClientErrorType} from 'flipper-common';
import {safeJSONStringify} from '../utils/safeJSONStringify';

// TODO: Share with js-flipper? Is it worth it?
type FlipperPluginReceiverRes =
  | object
  | string
  | number
  | boolean
  | null
  | undefined
  | void;

type FlipperPluginReceiver = (
  data: any,
) => FlipperPluginReceiverRes | Promise<FlipperPluginReceiverRes>;

export class ServerAddOnModuleToDesktopConnection {
  private subscriptions: Map<string, FlipperPluginReceiver> = new Map();

  send() {
    // TODO: Implement me
  }

  receive(method: string, receiver: FlipperPluginReceiver) {
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
