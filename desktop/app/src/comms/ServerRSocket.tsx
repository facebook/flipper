/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SecureServerConfig} from '../utils/CertificateProvider';
import ServerAdapter, {
  SecureClientQuery,
  ServerEventsListener,
} from './ServerAdapter';
import tls from 'tls';
import net, {Socket} from 'net';
import {RSocketServer} from 'rsocket-core';
import RSocketTCPServer from 'rsocket-tcp-server';
import {Payload, ReactiveSocket, Responder} from 'rsocket-types';
import Client, {ClientQuery} from '../Client';
import {Single} from 'rsocket-flowable';
import {
  ClientConnection,
  ConnectionStatusChange,
  ConnectionStatus,
  ResponseType,
} from './ClientConnection';

/**
 * RSocket based server. RSocket uses its own protocol for communication between
 * client and server.
 */
class ServerRSocket extends ServerAdapter {
  rawServer_: RSocketServer<any, any> | null | undefined;
  constructor(listener: ServerEventsListener) {
    super(listener);
    this.rawServer_ = null;
  }

  /**
   * Start the server bound to the specified port. It configures
   * the RSocket server factory and request handler based on the optional
   * sslConfig argument.
   */
  start(port: number, sslConfig?: SecureServerConfig): Promise<boolean> {
    const self = this;
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line prefer-const
      let rawServer: RSocketServer<any, any> | undefined;
      const serverFactory = (onConnect: (socket: Socket) => void) => {
        const transportServer = sslConfig
          ? tls.createServer(sslConfig, (socket) => {
              onConnect(socket);
            })
          : net.createServer(onConnect);
        transportServer
          .on('error', (err) => {
            self.listener.onError(err);
            console.error(`Error opening server on port ${port}`, 'server');
            reject(err);
          })
          .on('listening', () => {
            console.debug(
              `${
                sslConfig ? 'Secure' : 'Certificate'
              } server started on port ${port}`,
              'server',
            );
            self.listener.onListening(port);
            self.rawServer_ = rawServer;
            resolve(true);
          });
        return transportServer;
      };
      rawServer = new RSocketServer({
        getRequestHandler: sslConfig
          ? this._trustedRequestHandler
          : this._untrustedRequestHandler,
        transport: new RSocketTCPServer({
          port: port,
          serverFactory: serverFactory,
        }),
      });
      rawServer && rawServer.start();
    });
  }

  stop(): Promise<void> {
    if (this.rawServer_) {
      return Promise.resolve(this.rawServer_.stop());
    }
    return Promise.resolve();
  }

  /**
   * Handle an incoming connection request over TLS.
   * @param socket Underlying socket connection.
   * @param payload Payload or message received.
   * @returns Returns a valid RSocket responder which will handle further
   * communication from the client.
   */
  _trustedRequestHandler = (
    socket: ReactiveSocket<string, any>,
    payload: Payload<string, any>,
  ): Partial<Responder<string, any>> => {
    if (!payload.data) {
      return {};
    }

    const clientQuery: SecureClientQuery = JSON.parse(payload.data);
    this.listener.onSecureConnectionAttempt(clientQuery);

    const clientConnection: ClientConnection = {
      subscribeToEvents(subscriber: ConnectionStatusChange): void {
        socket.connectionStatus().subscribe({
          onNext(payload) {
            let status = ConnectionStatus.CONNECTED;

            if (payload.kind == 'ERROR') status = ConnectionStatus.ERROR;
            else if (payload.kind == 'CLOSED') status = ConnectionStatus.CLOSED;
            else if (payload.kind == 'CONNECTED')
              status = ConnectionStatus.CONNECTED;
            else if (payload.kind == 'NOT_CONNECTED')
              status = ConnectionStatus.NOT_CONNECTED;
            else if (payload.kind == 'CONNECTING')
              status = ConnectionStatus.CONNECTING;

            subscriber(status);
          },
          onSubscribe(subscription) {
            subscription.request(Number.MAX_SAFE_INTEGER);
          },
          onError(payload) {
            console.error('[client] connection status error ', payload);
          },
        });
      },
      close(): void {
        socket.close();
      },
      send(data: any): void {
        socket.fireAndForget({data: JSON.stringify(data)});
      },
      sendExpectResponse(data: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
          socket
            .requestResponse({
              data: JSON.stringify(data),
            })
            .subscribe({
              onComplete: (payload: Payload<any, any>) => {
                const response: ResponseType = JSON.parse(payload.data);
                response.length = payload.data.length;
                resolve(response);
              },
              onError: (e) => {
                reject(e);
              },
            });
        });
      },
    };

    let resolvedClient: Client | undefined;
    const client: Promise<Client> = this.listener.onConnectionCreated(
      clientQuery,
      clientConnection,
    );
    client.then((client) => (resolvedClient = client)).catch((_) => {});

    return {
      fireAndForget: (payload: {data: string}) => {
        if (resolvedClient) {
          resolvedClient.onMessage(payload.data);
        } else {
          client &&
            client
              .then((client) => {
                client.onMessage(payload.data);
              })
              .catch((_) => {});
        }
      },
    };
  };

  /**
   * Handle an incoming connection request over an insecure connection.
   * @param socket Underlying socket connection.
   * @param payload Payload or message received.
   * @returns Returns a valid RSocket responder which will handle further
   * communication from the client.
   */
  _untrustedRequestHandler = (
    _socket: ReactiveSocket<string, any>,
    payload: Payload<string, any>,
  ): Partial<Responder<string, any>> => {
    if (!payload.data) {
      return {};
    }

    const clientQuery: ClientQuery = JSON.parse(payload.data);
    this.listener.onConnectionAttempt(clientQuery);

    return {
      requestResponse: (
        payload: Payload<string, any>,
      ): Single<Payload<string, any>> => {
        if (typeof payload.data !== 'string') {
          return new Single((_) => {});
        }

        let rawData: any;
        try {
          rawData = JSON.parse(payload.data);
        } catch (err) {
          console.error(
            `Invalid JSON: ${payload.data}`,
            'clientMessage',
            'server',
          );
          return new Single((_) => {});
        }

        return new Single((subscriber) => {
          subscriber.onSubscribe(undefined);
          this._onHandleUntrustedMessage(clientQuery, rawData)
            .then((response) => {
              subscriber.onComplete({
                data: response,
                metadata: '',
              });
            })
            .catch((err) => {
              subscriber.onError(err);
            });
        });
      },
      // Can probably refactor this out
      // Leaving this here for a while for backwards compatibility,
      // but for up to date SDKs it will no longer used.
      fireAndForget: (payload: Payload<string, any>) => {
        if (typeof payload.data !== 'string') {
          return;
        }

        let rawData: any;
        try {
          rawData = JSON.parse(payload.data);
        } catch (err) {
          console.error(`Invalid JSON: ${payload.data}`, 'server');
          return;
        }

        if (rawData && rawData.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');
          this._onHandleUntrustedMessage(clientQuery, rawData)
            .then((_) => {})
            .catch((err) => {
              console.error('Unable to process CSR, failed with error.', err);
            });
        }
      },
    };
  };
}

export default ServerRSocket;
