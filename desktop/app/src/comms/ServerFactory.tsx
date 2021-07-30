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
import ServerWebSocketBrowser from './ServerWebSocketBrowser';

function _createServer(listener: ServerEventsListener) {
  /**
   * GK could be setup or queried to determine whether to use RSocket or
   * WebSocket. Default is RSocket, but the stage is set for different type
   * of communication channels.
   */
  return new ServerRSocket(listener);
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
): Promise<ServerAdapter> {
  return new Promise((resolve, reject) => {
    const server = _createServer(listener);
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
