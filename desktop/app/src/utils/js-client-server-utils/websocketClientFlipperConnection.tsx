/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import WebSocket from 'ws';
import {
  ConnectionStatusChange,
  ConnectionStatus,
  ClientConnection,
  ResponseType,
} from '../../comms/ClientConnection';

export class WebsocketClientFlipperConnection implements ClientConnection {
  websocket: WebSocket;
  connStatusSubscribers: Set<ConnectionStatusChange> = new Set();
  connStatus: ConnectionStatus;
  app: string;
  plugins: string[] | undefined = undefined;

  constructor(ws: WebSocket, app: string, plugins: string[]) {
    this.websocket = ws;
    this.connStatus = ConnectionStatus.CONNECTED;
    this.app = app;
    this.plugins = plugins;
  }
  subscribeToEvents(subscriber: ConnectionStatusChange): void {
    this.connStatusSubscribers.add(subscriber);
  }
  send(data: any): void {
    this.websocket.send(
      JSON.stringify({
        type: 'send',
        app: this.app,
        payload: data != null ? data : {},
      }),
    );
  }
  sendExpectResponse(data: any): Promise<ResponseType> {
    return new Promise((resolve, reject) => {
      const {id: callId = undefined, method = undefined} =
        data != null ? data : {};

      if (method === 'getPlugins' && this.plugins != null) {
        resolve({
          success: {plugins: this.plugins},
          length: 0,
        });
        return;
      }

      this.websocket.send(
        JSON.stringify({
          type: 'call',
          app: this.app,
          payload: data != null ? data : {},
        }),
      );

      this.websocket.on('message', (message: string) => {
        const {app, payload} = JSON.parse(message);

        if (app === this.app && payload?.id === callId) {
          resolve(payload);
        }
      });
      this.websocket.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  close(): void {
    this.connStatus = ConnectionStatus.CLOSED;
    this.connStatusSubscribers.forEach((subscriber) => {
      subscriber(this.connStatus);
    });
    this.websocket.send(JSON.stringify({type: 'disconnect', app: this.app}));
  }
}
