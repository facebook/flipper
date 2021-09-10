/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ServerWebSocketBase from './ServerWebSocketBase';
import WebSocket from 'ws';
import querystring from 'querystring';
import Client, {ClientQuery} from '../../Client';
import {BrowserClientFlipperConnection} from './BrowserClientFlipperConnection';
import {ServerEventsListener} from './ServerAdapter';
import constants from '../../fb-stubs/constants';
import ws from 'ws';
import {IncomingMessage} from 'http';

/**
 * WebSocket-based server which uses a connect/disconnect handshake over an insecure channel.
 */
class ServerWebSocketBrowser extends ServerWebSocketBase {
  constructor(listener: ServerEventsListener) {
    super(listener);
  }

  verifyClient(): ws.VerifyClientCallbackSync {
    return (info: {origin: string; req: IncomingMessage; secure: boolean}) => {
      const ok = constants.VALID_WEB_SOCKET_REQUEST_ORIGIN_PREFIXES.some(
        (validPrefix) => info.origin.startsWith(validPrefix),
      );
      if (!ok) {
        console.warn(
          `[conn] Refused webSocket connection from ${info.origin} (secure: ${info.secure})`,
        );
      }
      return ok;
    };
  }

  /**
   * A connection has been established between the server and a client.
   * @param ws An active WebSocket.
   * @param message Incoming request message.
   */
  onConnection(ws: WebSocket, message: any): void {
    const clients: {
      [app: string]: Promise<Client>;
    } = {};

    /**
     * Any required arguments to construct a ClientQuery come
     * embedded in the query string.
     */
    const query = querystring.decode(message.url.split('?')[1]);
    const deviceId: string =
      typeof query.deviceId === 'string' ? query.deviceId : 'webbrowser';
    const device =
      typeof query.device === 'string' ? query.device : 'WebSocket';

    const clientQuery: ClientQuery = {
      device_id: deviceId,
      device,
      app: device,
      os: 'MacOS', // TODO: not hardcoded! Use host device?
    };

    console.log(
      `[conn] Local websocket connection attempt: ${clientQuery.app} on ${clientQuery.device_id}.`,
    );
    this.listener.onConnectionAttempt(clientQuery);

    const cleanup = () => {
      Object.values(clients).map((p) =>
        p.then((c) => this.listener.onConnectionClosed(c.id)),
      );
      // TODO: destroy device.
      // This seems to be the only case in which a device gets destroyed when there's a disconnection
      // or error on the transport layer.
      //
      // destroyDevice(this.store, this.logger, deviceId);
    };

    /**
     * Subscribe to the 'message' event. Initially, a handshake should take place in the form of a
     * 'connect' message. Once received, a client connection will be established and registered. This
     * is followed by another subscription to the 'message' event, again. Effectively, two listeners
     * are now attached to that event. The former will continue to check for 'connect' and 'disconnect'
     * messages. The latter will deliver messages to the client.
     */
    ws.on('message', (rawMessage: any) => {
      let message: any | undefined;
      try {
        message = JSON.parse(rawMessage.toString());
      } catch (error) {
        // Throws a SyntaxError exception if the string to parse is not valid JSON.
        console.log('Received message is not valid.', error);
        return;
      }

      switch (message.type) {
        case 'connect': {
          const app = message.app;
          const plugins = message.plugins;

          const clientConnection = new BrowserClientFlipperConnection(
            ws,
            app,
            plugins,
          );

          const extendedClientQuery = {...clientQuery, medium: 3 as const};
          extendedClientQuery.sdk_version = plugins == null ? 4 : 1;

          console.log(
            `[conn] Local websocket connection established: ${clientQuery.app} on ${clientQuery.device_id}.`,
          );

          let resolvedClient: Client | null = null;
          this.listener.onSecureConnectionAttempt(extendedClientQuery);
          const client: Promise<Client> = this.listener.onConnectionCreated(
            extendedClientQuery,
            clientConnection,
          );
          client
            .then((client) => {
              console.log(
                `[conn] Client created: ${clientQuery.app} on ${clientQuery.device_id}.`,
              );
              resolvedClient = client;
            })
            .catch((e) => {
              console.error(
                '[conn] Failed to connect client over webSocket',
                e,
              );
            });

          clients[app] = client;

          ws.on('message', (m: any) => {
            let parsed: any | undefined;
            try {
              parsed = JSON.parse(m.toString());
            } catch (error) {
              // Throws a SyntaxError exception if the string to parse is not valid JSON.
              console.log('[conn] Received message is not valid.', error);
              return;
            }
            // non-null payload id means response to prev request, it's handled in connection
            if (parsed.app === app && parsed.payload?.id == null) {
              const message = JSON.stringify(parsed.payload);
              if (resolvedClient) {
                resolvedClient.onMessage(message);
              } else {
                client.then((c) => c.onMessage(message)).catch((_) => {});
              }
            }
          });
          break;
        }
        case 'disconnect': {
          const app = message.app;
          (clients[app] || Promise.resolve())
            .then((c) => {
              this.listener.onConnectionClosed(c.id);
              delete clients[app];
            })
            .catch((_) => {});
          break;
        }
      }
    });

    /** Close event from the existing client connection. */
    ws.on('close', () => {
      cleanup();
    });
    /** Error event from the existing client connection. */
    ws.on('error', (error) => {
      console.warn('[conn] Server found connection error: ' + error);
      cleanup();
    });
  }
}

export default ServerWebSocketBrowser;
