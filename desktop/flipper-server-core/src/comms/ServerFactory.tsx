/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SecureServerConfig} from '../utils/CertificateProvider';
import ServerAdapter, {ServerEventsListener} from './ServerAdapter';
import ServerRSocket from './ServerRSocket';
import ServerWebSocket from './ServerWebSocket';
import ServerWebSocketBrowser from './ServerWebSocketBrowser';

export enum TransportType {
  RSocket,
  WebSocket,
}

/**
 * Creates a server to be used by Flipper. The created server will be set into
 * the promise once it has started and bound to the specified port.
 * @param port A port number in which to listen for incoming connections.
 * @param listener An object implementing the ServerEventsListener interface.
 * @param sslConfig An SSL configuration for TLS servers.
 */
export function createServer(
  port: number,
  listener: ServerEventsListener,
  sslConfig?: SecureServerConfig,
  transportType: TransportType = TransportType.RSocket,
): Promise<ServerAdapter> {
  return new Promise((resolve, reject) => {
    const server =
      transportType === TransportType.RSocket
        ? new ServerRSocket(listener)
        : new ServerWebSocket(listener);
    server
      .start(port, sslConfig)
      .then((started) => {
        if (started) {
          resolve(server);
        } else {
          reject(
            new Error(`An error occurred whilst trying
                     to start the server listening at port ${port}`),
          );
        }
      })
      .catch((error: any) => {
        reject(error);
      });
  });
}

/**
 * Creates a server to be used by Flipper to allow Browser connections.
 * The protocol is slightly different for Browser connections hence a different
 * factory method. The created server will be set into the promise
 * once it has started and bound to the specified port.
 * @param port A port number in which to listen for incoming connections.
 * @param listener An object implementing the ServerEventsListener interface.
 * @returns
 */
export function createBrowserServer(
  port: number,
  listener: ServerEventsListener,
): Promise<ServerAdapter> {
  return new Promise((resolve, reject) => {
    const server = new ServerWebSocketBrowser(listener);
    server
      .start(port)
      .then((started) => {
        if (started) {
          resolve(server);
        } else {
          reject(
            new Error(`An error occurred whilst trying
                     to start the server listening at port ${port}`),
          );
        }
      })
      .catch((error: any) => {
        reject(error);
      });
  });
}
