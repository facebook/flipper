/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperErrorMessage, FlipperMessageBus} from './message';
import {FlipperPluginConnection, FlipperPluginReceiver} from './plugin';
import {FlipperResponder} from './responder';
import {isPromise, safeJSONStringify} from './util';

type FlipperReceiver = (data: unknown, responder: FlipperResponder) => void;

export class FlipperConnection implements FlipperPluginConnection {
  pluginId: string;
  private client: FlipperMessageBus;
  private subscriptions: Map<string, FlipperReceiver> = new Map();

  constructor(pluginId: string, client: FlipperMessageBus) {
    this.pluginId = pluginId;
    this.client = client;
  }

  send(method: string, params?: unknown) {
    this.client.sendData({
      method: 'execute',
      params: {
        api: this.pluginId,
        method,
        params,
      },
    });
  }

  receive(method: string, receiver: FlipperPluginReceiver) {
    const wrappedReceiver: FlipperReceiver = (data, responder) => {
      const handleError = (e: unknown) => {
        const errorMessage: FlipperErrorMessage =
          e instanceof Error
            ? {name: e.name, message: e.message, stacktrace: e.stack}
            : {name: 'Unknown', message: safeJSONStringify(e)};
        responder.error(errorMessage);
      };
      try {
        const response = receiver(data);
        if (isPromise(response)) {
          response.then((data) => responder.success(data)).catch(handleError);
          return;
        }
        responder.success(response);
      } catch (e) {
        handleError(e);
      }
    };
    this.subscriptions.set(method, wrappedReceiver);
  }

  call(method: string, params: unknown, responder: FlipperResponder) {
    const receiver = this.subscriptions.get(method);
    if (receiver == null) {
      const errorMessage = `Receiver ${method} not found.`;
      responder.error({message: errorMessage});
      return;
    }
    receiver.call(receiver, params, responder);
  }

  hasReceiver(method: string): boolean {
    return this.subscriptions.has(method);
  }
}
