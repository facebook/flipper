/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'eventemitter3';
import {FlipperServer} from 'flipper-common';
import {io, Socket} from 'socket.io-client';

const CONNECTION_TIMEOUT = 30 * 1000;
const EXEC_TIMOUT = 30 * 10 * 1000;

export function createFlipperServer(): Promise<FlipperServer> {
  // TODO: polish this all!
  window.flipperShowError?.('Connecting to server...');
  return new Promise<FlipperServer>((resolve, reject) => {
    const initialConnectionTimeout = setTimeout(() => {
      reject(
        new Error('Failed to connect to Flipper server in a timely manner'),
      );
    }, CONNECTION_TIMEOUT);

    const eventEmitter = new EventEmitter();
    // TODO: recycle the socket that is created in index.web.dev.html?
    const socket: Socket = io();
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

    socket.on('connect', () => {
      window?.flipperHideError?.();
      console.log('Socket to Flipper server connected');
      connected = true;
    });

    socket.once('connect', () => {
      // only relevant for the first connect
      resolve(flipperServer);
      clearTimeout(initialConnectionTimeout);
    });

    socket.on('disconnect', () => {
      window?.flipperShowError?.('WebSocket connection lost');
      console.warn('Socket to Flipper server disconnected');
      connected = false;
    });

    socket.on('exec-response', (id: number, data: any) => {
      console.debug('exec <<<', id, data);
      const entry = pendingRequests.get(id);
      if (!entry) {
        console.warn(`Unknown request id `, id);
      } else {
        pendingRequests.delete(id);
        clearTimeout(entry.timeout);
        entry.resolve(data);
      }
    });

    socket.on('exec-response-error', (id: number, error: any) => {
      // TODO: Deserialize error
      console.debug('exec <<< [SERVER ERROR]', id, error);
      const entry = pendingRequests.get(id);
      if (!entry) {
        console.warn(`Unknown request id `, id);
      } else {
        pendingRequests.delete(id);
        clearTimeout(entry.timeout);
        entry.reject(error);
      }
    });

    socket.on('event', (eventType, data) => {
      eventEmitter.emit(eventType, data);
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

            socket.emit('exec', id, command, args);
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
