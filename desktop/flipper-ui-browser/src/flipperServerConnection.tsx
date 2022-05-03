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

export function createFlipperServer(): Promise<FlipperServer> {
  // TODO: polish this all!
  window.flipperShowError?.('Connecting to server...');
  return new Promise<FlipperServer>((resolve, reject) => {
    let initialConnectionTimeout: number | undefined = window.setTimeout(() => {
      reject(
        new Error('Failed to connect to Flipper server in a timely manner'),
      );
    }, CONNECTION_TIMEOUT);

    const eventEmitter = new EventEmitter();
    // TODO: recycle the socket that is created in index.web.dev.html?
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
        // only relevant for the first connect
        resolve(flipperServer);
        clearTimeout(initialConnectionTimeout);
        initialConnectionTimeout = undefined;
      }

      window?.flipperHideError?.();
      console.log('Socket to Flipper server connected');
      connected = true;
    });

    socket.addEventListener('close', () => {
      window?.flipperShowError?.('WebSocket connection lost');
      console.warn('Socket to Flipper server disconnected');
      connected = false;
      pendingRequests.forEach((r) =>
        r.reject(new Error('FLIPPER_SERVER_SOCKET_CONNECT_LOST')),
      );
      pendingRequests.clear();
    });

    socket.addEventListener('message', ({data}) => {
      const {event, payload} = JSON.parse(
        data.toString(),
      ) as ServerWebSocketMessage;

      switch (event) {
        case 'exec-response': {
          console.debug('exec <<<', payload);
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
          console.debug('exec <<< [SERVER ERROR]', payload.id, payload.data);
          const entry = pendingRequests.get(payload.id);
          if (!entry) {
            console.warn(`Unknown request id `, payload.id);
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
            'createFlipperServer -> unknown message',
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
            console.debug('exec >>>', id, command, args);

            pendingRequests.set(id, {
              resolve,
              reject,
              timeout: setInterval(() => {
                pendingRequests.delete(id);
                reject(new Error(`Timeout for command '${command}'`));
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
          //   socket.
        } else {
          throw new Error('Not connected to Flipper Server');
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
