/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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

  matchPendingRequest(id: number): PendingRequestResolvers {
    const callbacks = this.pendingRequests.get(id);

    if (!callbacks) {
      throw new Error(`Pending request ${id} is not found`);
    }

    this.pendingRequests.delete(id);
    return callbacks;
  }

  protected serializeData(data: object): string {
    return JSON.stringify(data);
  }
}
