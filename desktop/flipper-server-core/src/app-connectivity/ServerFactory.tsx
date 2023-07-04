/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SecureServerConfig} from './certificate-exchange/certificate-utils';
import ServerWebSocketBase, {ServerEventsListener} from './ServerWebSocketBase';
import ServerRSocket from './ServerRSocket';
import SecureServerWebSocket from './SecureServerWebSocket';
import BrowserServerWebSocket from './BrowserServerWebSocket';
import ServerWebSocket from './ServerWebSocket';

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
export async function createServer(
  port: number,
  listener: ServerEventsListener,
  sslConfig?: SecureServerConfig,
  transportType: TransportType = TransportType.RSocket,
): Promise<ServerWebSocketBase> {
  let server: ServerWebSocketBase;
  if (transportType === TransportType.RSocket) {
    server = new ServerRSocket(listener);
  } else if (sslConfig) {
    server = new SecureServerWebSocket(listener);
  } else {
    server = new ServerWebSocket(listener);
  }
  await server.start(port, sslConfig);
  return server;
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
export async function createBrowserServer(
  port: number,
  listener: ServerEventsListener,
): Promise<ServerWebSocketBase> {
  const server = new BrowserServerWebSocket(listener);
  await server.start(port);
  return server;
}
