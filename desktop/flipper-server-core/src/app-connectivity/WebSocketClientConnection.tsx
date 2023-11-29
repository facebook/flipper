/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientResponseType} from 'flipper-common';
import WebSocket from 'ws';
import {WSCloseCode} from '../utils/WSCloseCode';
import {
  ClientConnection,
  ConnectionStatus,
  ConnectionStatusChange,
  PendingRequestResolvers,
} from './ClientConnection';

export default class WebSocketClientConnection implements ClientConnection {
  protected pendingRequests: Map<number, PendingRequestResolvers> = new Map();
  constructor(protected ws: WebSocket) {}
  subscribeToEvents(subscriber: ConnectionStatusChange): void {
    this.ws.on('close', () => subscriber(ConnectionStatus.CLOSED));
    this.ws.on('error', () => subscriber(ConnectionStatus.ERROR));
  }
  close(): void {
    this.ws.close(WSCloseCode.NormalClosure);
  }
  send(data: any): void {
    this.ws.send(this.serializeData(data));
  }
  sendExpectResponse(data: any): Promise<ClientResponseType> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(data.id, {reject, resolve});
      this.ws.send(this.serializeData(data));
    });
  }

  matchPendingRequest(id: number): PendingRequestResolvers | undefined {
    const callbacks = this.pendingRequests.get(id);

    if (!callbacks) {
      console.debug(`[ws] Pending request ${id} is not found. Ignore.`);
      // It must be a response for a message from the older connection. Ignore.
      // TODO: When we decide to bump sdk_version, make `id` a string equal to `connectionId:messageId`.
      // Ignore messages only from other conections.
      // Raise an error for missing mesages from this connection.
      return;
    }

    this.pendingRequests.delete(id);
    return callbacks;
  }

  protected serializeData(data: object): string {
    return JSON.stringify(data);
  }
}
