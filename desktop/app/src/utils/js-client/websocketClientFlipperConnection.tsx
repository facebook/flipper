/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperClientConnection} from '../../Client';
import {Payload} from 'rsocket-types';
import {Flowable, Single} from 'rsocket-flowable';
import {ConnectionStatus, ISubscriber} from 'rsocket-types';
import WebSocket from 'ws';

export class WebsocketClientFlipperConnection<M>
  implements FlipperClientConnection<string, M> {
  websocket: WebSocket;
  connStatusSubscribers: Set<ISubscriber<ConnectionStatus>> = new Set();
  connStatus: ConnectionStatus;
  app: string;
  plugins: string[] = [];

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

  // TODO: fully implement and return actual result
  requestResponse(payload: Payload<string, M>): Single<Payload<string, M>> {
    return new Single((subscriber) => {
      const method =
        payload.data != null ? JSON.parse(payload.data).method : 'not-defined';
      subscriber.onSubscribe(() => {});
      if (method != 'getPlugins') {
        this.fireAndForget(payload);
      }
      subscriber.onComplete(
        method == 'getPlugins'
          ? {
              data: JSON.stringify({
                success: {plugins: this.plugins},
              }),
            }
          : {data: JSON.stringify({success: null})},
      );
    });
  }
}
