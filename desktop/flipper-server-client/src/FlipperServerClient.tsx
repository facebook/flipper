/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'eventemitter3';
import {
  ExecWebSocketMessage,
  FlipperServer,
  FlipperServerCommands,
  FlipperServerExecOptions,
  ServerWebSocketMessage,
  FlipperServerDisconnectedError,
  FlipperServerTimeoutError,
} from 'flipper-common';
import ReconnectingWebSocket from 'reconnecting-websocket';

const CONNECTION_TIMEOUT = 30 * 1000;
const EXEC_TIMEOUT = 45 * 1000;

export enum FlipperServerState {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
}
export type {FlipperServer, FlipperServerCommands, FlipperServerExecOptions};

export function createFlipperServer(
  host: string,
  port: number,
  tokenProvider: () => string | null | undefined,
  onStateChange: (state: FlipperServerState) => void,
): Promise<FlipperServer> {
  const URLProvider = () => {
    const token = tokenProvider();
    return `ws://${host}:${port}?token=${token}`;
  };

  const socket = new ReconnectingWebSocket(URLProvider);
  return createFlipperServerWithSocket(
    socket as WebSocket,
    port,
    onStateChange,
  );
}

export function createFlipperServerWithSocket(
  socket: WebSocket,
  port: number,
  onStateChange: (state: FlipperServerState) => void,
): Promise<FlipperServer> {
  onStateChange(FlipperServerState.CONNECTING);

  return new Promise<FlipperServer>((resolve, reject) => {
    let initialConnectionTimeout: ReturnType<typeof setTimeout> | undefined =
      setTimeout(() => {
        reject(
          new Error(
            `Failed to connect to the server in a timely manner.
             It may be unresponsive. Run the following from the terminal
             'sudo kill -9 $(lsof -t -i :${port})' as to kill any existing running instance, if any.`,
          ),
        );
      }, CONNECTION_TIMEOUT);

    const eventEmitter = new EventEmitter();

    const pendingRequests: Map<
      number,
      {
        resolve: (data: any) => void;
        reject: (data: any) => void;
        timeout: ReturnType<typeof setTimeout>;
      }
    > = new Map();
    let requestId = 0;
    let connected = false;

    socket.addEventListener('open', () => {
      connected = true;
      onStateChange(FlipperServerState.CONNECTED);

      if (initialConnectionTimeout) {
        clearTimeout(initialConnectionTimeout);
        initialConnectionTimeout = undefined;

        resolve(flipperServer);
      }
    });

    socket.addEventListener('close', () => {
      connected = false;
      onStateChange(FlipperServerState.DISCONNECTED);

      pendingRequests.forEach((r) =>
        r.reject(new FlipperServerDisconnectedError('ws-close')),
      );
      pendingRequests.clear();
    });

    socket.addEventListener('message', ({data}) => {
      try {
        const {event, payload} = JSON.parse(
          data.toString(),
        ) as ServerWebSocketMessage;

        switch (event) {
          case 'exec-response': {
            const entry = pendingRequests.get(payload.id);
            if (!entry) {
              console.warn(`Unknown request id `, payload.id);
            } else {
              pendingRequests.delete(payload.id);
              clearTimeout(entry.timeout);
              entry.resolve(payload.data);
            }
            break;
          }
          case 'exec-response-error': {
            const entry = pendingRequests.get(payload.id);
            if (!entry) {
              console.warn(`flipper-server: Unknown request id `, payload.id);
            } else {
              pendingRequests.delete(payload.id);
              clearTimeout(entry.timeout);
              entry.reject(payload.data);
            }
            break;
          }
          case 'server-event': {
            eventEmitter.emit(payload.event, payload.data);
            break;
          }
          default: {
            console.warn(
              'flipper-server: received unknown message type',
              data.toString(),
            );
          }
        }
      } catch (e) {
        console.warn(
          'flipper-server: failed to process message',
          data.toString(),
        );
      }
    });

    const commandOrOptionsIsOptions = (
      commandOrOptions: FlipperServerExecOptions | string,
    ): commandOrOptions is FlipperServerExecOptions =>
      typeof commandOrOptions === 'object';

    const flipperServer: FlipperServer = {
      async connect() {},
      close() {},
      exec(commandOrOptions, ...argsAmbiguous): any {
        let timeout: number;
        let command: string;
        let args: Parameters<
          FlipperServerCommands[keyof FlipperServerCommands]
        >;
        if (commandOrOptionsIsOptions(commandOrOptions)) {
          timeout = commandOrOptions.timeout;
          command = argsAmbiguous[0] as string;
          args = argsAmbiguous.slice(1) as typeof args;
        } else {
          timeout = EXEC_TIMEOUT;
          command = commandOrOptions;
          args = argsAmbiguous as typeof args;
        }

        if (connected) {
          const id = ++requestId;
          return new Promise<any>((resolve, reject) => {
            pendingRequests.set(id, {
              resolve,
              reject,
              timeout: setInterval(() => {
                pendingRequests.delete(id);
                reject(
                  new FlipperServerTimeoutError(
                    `timeout for command '${command}'`,
                  ),
                );
              }, timeout),
            });

            const execMessage = {
              event: 'exec',
              payload: {
                id,
                command,
                args,
              },
            } as ExecWebSocketMessage;
            socket.send(JSON.stringify(execMessage));
          });
        } else {
          throw new Error('Not connected to Flipper server');
        }
      },
      on(event, callback) {
        eventEmitter.on(event, callback);
      },
      off(event, callback) {
        eventEmitter.off(event, callback);
      },
    };
  });
}
