/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperClientConnection} from '../../Client';
import {Flowable, Single} from 'rsocket-flowable';
import {Payload, ConnectionStatus, ISubscriber} from 'rsocket-types';
import WebSocket from 'ws';

export class WebsocketClientFlipperConnection<M>
  implements FlipperClientConnection<string, M>
{
  websocket: WebSocket;
  connStatusSubscribers: Set<ISubscriber<ConnectionStatus>> = new Set();
  connStatus: ConnectionStatus;
  app: string;
  plugins: string[] | undefined = undefined;

  constructor(ws: WebSocket, app: string, plugins: string[]) {
    this.websocket = ws;
    this.connStatus = {kind: 'CONNECTED'};
    this.app = app;
    this.plugins = plugins;
  }

  connectionStatus(): Flowable<ConnectionStatus> {
    return new Flowable<ConnectionStatus>((subscriber) => {
      subscriber.onSubscribe({
        cancel: () => {
          this.connStatusSubscribers.delete(subscriber);
        },
        request: (_) => {
          this.connStatusSubscribers.add(subscriber);
          subscriber.onNext(this.connStatus);
        },
      });
    });
  }

  close(): void {
    this.connStatus = {kind: 'CLOSED'};
    this.connStatusSubscribers.forEach((subscriber) => {
      subscriber.onNext(this.connStatus);
    });
    this.websocket.send(JSON.stringify({type: 'disconnect', app: this.app}));
  }

  fireAndForget(payload: Payload<string, M>): void {
    this.websocket.send(
      JSON.stringify({
        type: 'send',
        app: this.app,
        payload: payload.data != null ? payload.data : {},
      }),
    );
  }

  requestResponse(payload: Payload<string, M>): Single<Payload<string, M>> {
    return new Single((subscriber) => {
      const {id: callId = undefined, method = undefined} =
        payload.data != null ? JSON.parse(payload.data) : {};

      subscriber.onSubscribe(() => {});

      if (method === 'getPlugins' && this.plugins != null) {
        subscriber.onComplete({
          data: JSON.stringify({
            success: {plugins: this.plugins},
          }),
        });
        return;
      }

      this.websocket.send(
        JSON.stringify({
          type: 'call',
          app: this.app,
          payload: payload.data != null ? payload.data : {},
        }),
      );

      this.websocket.on('message', (message: string) => {
        const {app, payload} = JSON.parse(message);

        if (app === this.app && payload?.id === callId) {
          subscriber.onComplete({data: JSON.stringify(payload)});
        }
      });
    });
  }
}
