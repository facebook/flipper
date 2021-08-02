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
import ws from 'ws';
import {SecureClientQuery, ServerEventsListener} from './ServerAdapter';
import querystring from 'querystring';
import Client, {ClientQuery} from '../Client';
import {OS} from '../devices/BaseDevice';
import {
  ClientConnection,
  ConnectionStatus,
  ConnectionStatusChange,
  ErrorType,
} from './ClientConnection';
import {IncomingMessage} from 'http';

/**
 * WebSocket-based server.
 */
class ServerWebSocket extends ServerWebSocketBase {
  constructor(listener: ServerEventsListener) {
    super(listener);
  }

  /**
   * Client verification is not necessary. The connected client has
   * already been verified using its certificate signed by the server.
   * @returns
   */
  verifyClient(): ws.VerifyClientCallbackSync {
    return (_info: {origin: string; req: IncomingMessage; secure: boolean}) => {
      return true;
    };
  }

  /**
   * A connection has been established between the server and a client. Only ever used for
   * certificate exchange.
   * @param ws An active WebSocket.
   * @param message Incoming request message.
   */
  onConnection(ws: WebSocket, message: any): void {
    const query = querystring.decode(message.url.split('?')[1]);
    const clientQuery = this._parseClientQuery(query);
    if (!clientQuery) {
      console.warn('Unable to extract the client query from the request URL.');
      ws.close();
      return;
    }

    this.listener.onConnectionAttempt(clientQuery);

    ws.on('message', async (message: any) => {
      const json = JSON.parse(message.toString());
      const response = await this._onHandleUntrustedMessage(clientQuery, json);
      if (response) {
        ws.send(response);
      }
    });
  }

  /**
   * A secure connection has been established between the server and a client. Once a client
   * has a valid certificate, it can use a secure connection with Flipper and start exchanging
   * messages.
   * @param _ws An active WebSocket.
   * @param message Incoming request message.
   */
  onSecureConnection(ws: WebSocket, message: any): void {
    const query = querystring.decode(message.url.split('?')[1]);
    const clientQuery = this._parseSecureClientQuery(query);
    if (!clientQuery) {
      console.warn('Unable to extract the client query from the request URL.');
      ws.close();
      return;
    }
    this.listener.onSecureConnectionAttempt(clientQuery);

    const pendingRequests: Map<
      number,
      {
        resolve: (data: any) => void;
        reject: (err: Error) => void;
      }
    > = new Map();

    const clientConnection: ClientConnection = {
      subscribeToEvents(subscriber: ConnectionStatusChange): void {
        ws.on('close', () => subscriber(ConnectionStatus.CLOSED));
        ws.on('error', () => subscriber(ConnectionStatus.ERROR));
      },
      close(): void {
        ws.close();
      },
      send(data: any): void {
        ws.send(JSON.stringify(data));
      },
      sendExpectResponse(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
          pendingRequests.set(data.id, {reject, resolve});
          ws.send(JSON.stringify(data));
        });
      },
    };

    let resolvedClient: Client | undefined;
    const client: Promise<Client> = this.listener.onConnectionCreated(
      clientQuery,
      clientConnection,
    );
    client.then((client) => (resolvedClient = client)).catch((_) => {});

    ws.on('message', (message: any) => {
      let json: any | undefined;
      try {
        json = JSON.parse(message);
      } catch (err) {
        console.warn(`Invalid JSON: ${message}`, 'clientMessage');
        return;
      }

      const data: {
        id?: number;
        success?: Object | undefined;
        error?: ErrorType | undefined;
      } = json;

      if (data.hasOwnProperty('id') && data.id) {
        const callbacks = pendingRequests.get(data.id);
        if (!callbacks) {
          return;
        }

        pendingRequests.delete(data.id);

        if (data.success) {
          callbacks.resolve && callbacks.resolve(data);
        } else if (data.error) {
          callbacks.reject && callbacks.reject(data.error);
        }
      } else {
        if (resolvedClient) {
          resolvedClient.onMessage(message);
        } else {
          client &&
            client
              .then((client) => {
                client.onMessage(message);
              })
              .catch((_) => {});
        }
      }
    });
  }

  /**
   * Validates a string as being one of those defined as valid OS.
   * @param str An input string.
   */
  private isOS(str: string): str is OS {
    return (
      str === 'iOS' ||
      str === 'Android' ||
      str === 'Metro' ||
      str === 'Windows' ||
      str === 'MacOS' ||
      str === 'JSWebApp'
    );
  }

  /**
   * Parse and extract a ClientQuery instance from a message. The ClientQuery
   * data will be contained in the message url query string.
   * @param message An incoming web socket message.
   */
  private _parseClientQuery(
    query: querystring.ParsedUrlQuery,
  ): ClientQuery | undefined {
    /** Any required arguments to construct a ClientQuery come
     * embedded in the query string.
     */
    let device_id: string | undefined;
    if (typeof query.device_id === 'string') {
      device_id = query.device_id;
    } else {
      return;
    }

    let device: string | undefined;
    if (typeof query.device === 'string') {
      device = query.device;
    } else {
      return;
    }

    let app: string | undefined;
    if (typeof query.app === 'string') {
      app = query.app;
    } else {
      return;
    }

    let os: OS | undefined;
    if (typeof query.os === 'string' && this.isOS(query.os)) {
      os = query.os;
    } else {
      return;
    }

    const clientQuery: ClientQuery = {
      device_id,
      device,
      app,
      os,
    };

    if (typeof query.sdk_version === 'string') {
      const sdk_version = parseInt(query.sdk_version, 10);
      if (sdk_version) {
        clientQuery.sdk_version = sdk_version;
      }
    }

    return clientQuery;
  }

  /**
   * Parse and extract a SecureClientQuery instance from a message. The ClientQuery
   * data will be contained in the message url query string.
   * @param message An incoming web socket message.
   */
  private _parseSecureClientQuery(
    query: querystring.ParsedUrlQuery,
  ): SecureClientQuery | undefined {
    /** Any required arguments to construct a SecureClientQuery come
     * embedded in the query string.
     */
    const clientQuery = this._parseClientQuery(query);
    if (!clientQuery) {
      return;
    }

    let csr: string | undefined;
    if (typeof query.csr === 'string') {
      const buffer = Buffer.from(query.csr, 'base64');
      if (buffer) {
        csr = buffer.toString('ascii');
      }
    }

    let csr_path: string | undefined;
    if (typeof query.csr_path === 'string') {
      csr_path = query.csr_path;
    }

    let medium: number | undefined;
    if (typeof query.medium === 'string') {
      medium = parseInt(query.medium, 10);
    }

    return {...clientQuery, csr, csr_path, medium};
  }
}

export default ServerWebSocket;
