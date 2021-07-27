/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type ErrorType = {
  message: string;
  stacktrace: string;
  name: string;
};

export type ResponseType = {
  success?: Object;
  error?: ErrorType;
  length: number;
};

export enum ConnectionStatus {
  ERROR = 'error',
  CLOSED = 'closed',
  CONNECTED = 'connected',
  NOT_CONNECTED = 'not_connected',
  CONNECTING = 'connecting',
}

export type ConnectionStatusChange = (status: ConnectionStatus) => void;

export interface ClientConnection {
  subscribeToEvents(subscriber: ConnectionStatusChange): void;
  close(): void;
  send(data: any): void;
  sendExpectResponse(data: any): Promise<ResponseType>;
}
