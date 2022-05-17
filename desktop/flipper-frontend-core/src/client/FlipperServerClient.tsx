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
  ServerWebSocketMessage,
} from 'flipper-common';
import ReconnectingWebSocket from 'reconnecting-websocket';

const CONNECTION_TIMEOUT = 30 * 1000;
const EXEC_TIMOUT = 30 * 1000;

export enum FlipperServerState {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
}

export function createFlipperServer(
  onStateChange: (state: FlipperServerState) => void,
): Promise<FlipperServer> {
  onStateChange(FlipperServerState.CONNECTING);

  return new Promise<FlipperServer>((resolve, reject) => {
    let initialConnectionTimeout: number | undefined = window.setTimeout(() => {
      reject(
        new Error('Failed to connect to flipper-server in a timely manner'),
      );
    }, CONNECTION_TIMEOUT);

    const eventEmitter = new EventEmitter();

    const socket = new ReconnectingWebSocket(`ws://${location.host}`);
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
      if (initialConnectionTimeout) {
        resolve(flipperServer);
        clearTimeout(initialConnectionTimeout);
        initialConnectionTimeout = undefined;
      }

      onStateChange(FlipperServerState.CONNECTED);
      connected = true;
    });

    socket.addEventListener('close', () => {
      onStateChange(FlipperServerState.DISCONNECTED);
      connected = false;
      pendingRequests.forEach((r) =>
        r.reject(new Error('flipper-server disconnected')),
      );
      pendingRequests.clear();
    });

    socket.addEventListener('message', ({data}) => {
      const {event, payload} = JSON.parse(
        data.toString(),
      ) as ServerWebSocketMessage;

      switch (event) {
        case 'exec-response': {
          console.debug('flipper-server: exec <<<', payload);
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
          // TODO: Deserialize error
          console.debug(
            'flipper-server: exec <<< [SERVER ERROR]',
            payload.id,
            payload.data,
          );
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
    });

    const flipperServer: FlipperServer = {
      async connect() {},
      close() {},
      exec(command, ...args): any {
        if (connected) {
          const id = ++requestId;
          return new Promise<any>((resolve, reject) => {
            console.debug('flipper-server: exec >>>', id, command, args);

            pendingRequests.set(id, {
              resolve,
              reject,
              timeout: setInterval(() => {
                pendingRequests.delete(id);
                reject(
                  new Error(`flipper-server: timeout for command '${command}'`),
                );
              }, EXEC_TIMOUT),
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
