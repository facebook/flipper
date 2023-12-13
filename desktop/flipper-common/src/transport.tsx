/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServerCommands, FlipperServerEvents} from './server-types';

export type GenericWebSocketMessage<E = string, T = unknown> = {
  event: E;
  payload: T;
};

export type GenericWebSocketError = GenericWebSocketMessage<
  'error',
  {message: string}
>;

export type ExecWebSocketMessage = GenericWebSocketMessage<
  'exec',
  {
    [K in keyof FlipperServerCommands]: {
      id: number;
      command: K;
      args: Parameters<FlipperServerCommands[K]>;
    };
  }[keyof FlipperServerCommands]
>;

export type ExecResponseWebSocketMessage = GenericWebSocketMessage<
  'exec-response',
  {id: number; data: unknown}
>;

export type ExecResponseErrorWebSocketMessage = GenericWebSocketMessage<
  'exec-response-error',
  {id: number; data: unknown}
>;

export type ServerEventWebSocketMessage = GenericWebSocketMessage<
  'server-event',
  {
    [K in keyof FlipperServerEvents]: {event: K; data: FlipperServerEvents[K]};
  }[keyof FlipperServerEvents]
>;

export type ClientWebSocketMessage = ExecWebSocketMessage;
export type ServerWebSocketMessage =
  | ExecResponseWebSocketMessage
  | ExecResponseErrorWebSocketMessage
  | ServerEventWebSocketMessage;
