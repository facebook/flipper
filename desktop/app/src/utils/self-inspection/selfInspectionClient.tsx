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

import {FlipperClient} from 'flipper-client-sdk';

// somehow linter isn't happy with next import so type definitions are copied
// import {IFutureSubject} from 'rsocket-flowable/Single';

type CancelCallback = () => void;

interface IFutureSubject<T> {
  onComplete: (value: T) => void;
  onError: (error: Error) => void;
  onSubscribe: (cancel: CancelCallback | null | undefined) => void;
}

export class SelfInspectionFlipperClient<M>
  extends FlipperClient
  implements FlipperClientConnection<string, M> {
  connStatusSubscribers: Set<ISubscriber<ConnectionStatus>> = new Set();
  connStatus: ConnectionStatus = {kind: 'CONNECTED'};

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
  }

  fireAndForget(payload: Payload<string, M>): void {
    if (payload.data == null) {
      return;
    }
    const message = JSON.parse(payload.data) as {
      method: string;
      id: number;
      params: any;
    };
    this.onMessageReceived(message);
  }

  activeRequests = new Map<number, IFutureSubject<Payload<string, M>>>();

  requestResponse(payload: Payload<string, M>): Single<Payload<string, M>> {
    return new Single((subscriber) => {
      subscriber.onSubscribe(() => {});
      if (payload.data == null) {
        subscriber.onError(new Error('empty payload'));
        return;
      }
      const message = JSON.parse(payload.data) as {
        method: string;
        id: number;
        params: any;
      };
      this.activeRequests.set(message.id, subscriber);
      this.onMessageReceived(message);
    });
  }

  // Client methods

  messagesHandler: ((message: any) => void) | undefined;

  start(_appName: string): void {
    this.onConnect();
  }

  stop(): void {}

  sendData(payload: any): void {
    if (payload['success'] != null) {
      const message = payload as {id: number; success: unknown};
      const sub = this.activeRequests.get(message.id);
      sub?.onComplete({data: JSON.stringify(message)});
      this.activeRequests.delete(message.id);
      return;
    }

    this.messagesHandler && this.messagesHandler(payload);
  }

  isAvailable(): boolean {
    return true;
  }

  subscibeForClientMessages(handler: (message: any) => void) {
    this.messagesHandler = handler;
  }
}

export const selfInspectionClient = new SelfInspectionFlipperClient();
