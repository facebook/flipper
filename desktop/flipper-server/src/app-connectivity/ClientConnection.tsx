/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientResponseType} from 'flipper-common';

export interface PendingRequestResolvers {
  resolve: (data: ClientResponseType) => void;
  reject: (err: Error) => void;
}

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
  send(data: object): void;
  sendExpectResponse(data: object): Promise<ClientResponseType>;
}
