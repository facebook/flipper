/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ServerWebSocketBase, {ServerEventsListener} from './ServerWebSocketBase';
import tls from 'tls';
import net, {AddressInfo, Socket} from 'net';
import {RSocketServer} from 'rsocket-core';
import RSocketTCPServer from 'rsocket-tcp-server';
import {Payload, ReactiveSocket, Responder} from 'rsocket-types';
import {Single} from 'rsocket-flowable';
import {
  ClientConnection,
  ConnectionStatusChange,
  ConnectionStatus,
} from './ClientConnection';
import {
  ClientDescription,
  ClientQuery,
  ClientResponseType,
  SecureClientQuery,
} from 'flipper-common';
import {transformCertificateExchangeMediumToType} from './Utilities';
import {SecureServerConfig} from './certificate-exchange/certificate-utils';

/**
 * RSocket based server. RSocket uses its own protocol for communication between
 * client and server.
 */
class ServerRSocket extends ServerWebSocketBase {
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
  start(port: number, sslConfig?: SecureServerConfig): Promise<number> {
    const self = this;
    return new Promise((resolve, reject) => {
      try {
        // eslint-disable-next-line prefer-const
        let rawServer: RSocketServer<any, any> | undefined;
        const serverFactory = (onConnect: (socket: Socket) => void) => {
          const transportServer = sslConfig
            ? tls.createServer(sslConfig, (socket) => {
                onConnect(socket);
              })
            : net.createServer(onConnect);
          transportServer.on('error', reject).on('listening', () => {
            console.debug(
              `${
                sslConfig ? 'Secure' : 'Certificate'
              } server started on port ${port}`,
              'server',
            );
            self.listener.onListening(port);
            self.rawServer_ = rawServer;
            resolve((transportServer.address() as AddressInfo).port);
          });
          return transportServer;
        };
        rawServer = new RSocketServer({
          getRequestHandler: sslConfig
            ? this._trustedRequestHandler
            : this._untrustedRequestHandler,
          transport: new RSocketTCPServer({
            port,
            serverFactory,
          }),
        });
        rawServer.start();
      } catch (e) {
        reject(e);
      }
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

    const query = JSON.parse(payload.data);
    const clientQuery: SecureClientQuery = {
      ...query,
      medium: transformCertificateExchangeMediumToType(query.medium),
      rsocket: true,
    };

    this.listener.onDeprecationNotice(
      `[conn] RSockets are being deprecated at Flipper. Please, use the latest Flipper client in your app to migrate to WebSockets. App: ${clientQuery.app}. Device: ${clientQuery.device}.`,
    );

    this.listener.onSecureConnectionAttempt(clientQuery);
    console.info(
      `[conn] Secure rsocket connection attempt: ${clientQuery.app} on ${clientQuery.device_id}. Medium ${clientQuery.medium}. CSR: ${clientQuery.csr_path}`,
    );

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
                const response: ClientResponseType = JSON.parse(payload.data);
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

    let resolvedClient: ClientDescription | undefined;
    const client: Promise<ClientDescription> =
      this.listener.onConnectionCreated(clientQuery, clientConnection);
    client
      .then((client) => {
        console.info(
          `[conn] Client connected: ${clientQuery.app} on ${clientQuery.device_id}. Medium ${clientQuery.medium}. CSR: ${clientQuery.csr_path}`,
        );
        resolvedClient = client;
      })
      .catch((e) => {
        console.error('[conn] Failed to resolve new client', e);
      });

    return {
      fireAndForget: (payload: {data: string}) => {
        if (resolvedClient) {
          this.listener.onClientMessage(resolvedClient.id, payload.data);
        } else {
          client &&
            client
              .then((client) => {
                this.listener.onClientMessage(client.id, payload.data);
              })
              .catch((e) => {
                console.error('Could not deliver message: ', e);
              });
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

    const query = JSON.parse(payload.data);
    const clientQuery: ClientQuery = {
      ...query,
      medium: transformCertificateExchangeMediumToType(query.medium),
      rsocket: true,
    };
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
            `[conn] Invalid JSON: ${payload.data}`,
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
              console.error(
                '[conn] Unable to process CSR, failed with error.',
                err,
              );
            });
        }
      },
    };
  };

  protected stopAcceptingNewConectionsImpl(): void {
    // Did not find a straightforard way to iterate through RSocket open connections and close them.
    // We probably should not care and invest in it anyway as we are going to remove RScokets.
  }
}

export default ServerRSocket;
