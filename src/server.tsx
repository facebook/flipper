/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {SecureServerConfig} from './utils/CertificateProvider';
import {Logger} from './fb-interfaces/Logger';
import {ClientQuery} from './Client';
import {Store} from './reducers/index';
import CertificateProvider from './utils/CertificateProvider';
import {RSocketServer} from 'rsocket-core';
import RSocketTCPServer from 'rsocket-tcp-server';
import {Single} from 'rsocket-flowable';
import Client from './Client';
import {UninitializedClient} from './UninitializedClient';
import {reportPlatformFailures} from './utils/metrics';
import EventEmitter from 'events';
import invariant from 'invariant';
import tls from 'tls';
import net, {Socket} from 'net';
import {RSocketClientSocket} from 'rsocket-core/RSocketClient';
import {Responder, Payload, ReactiveSocket} from 'rsocket-types';

type ClientInfo = {
  connection: RSocketClientSocket<any, any> | null | undefined;
  client: Client;
};

type ClientCsrQuery = {
  csr?: string | undefined;
  csr_path?: string | undefined;
};

declare interface Server {
  on(event: 'new-client', callback: (client: Client) => void): this;
  on(event: 'error', callback: (err: Error) => void): this;
  on(event: 'clients-change', callback: () => void): this;
}

class Server extends EventEmitter {
  connections: Map<string, ClientInfo>;
  secureServer: Promise<RSocketServer<any, any>>;
  insecureServer: Promise<RSocketServer<any, any>>;
  certificateProvider: CertificateProvider;
  connectionTracker: ConnectionTracker;
  logger: Logger;
  store: Store;
  initialisePromise: Promise<void>;

  constructor(logger: Logger, store: Store) {
    super();
    this.logger = logger;
    this.connections = new Map();
    this.certificateProvider = new CertificateProvider(this, logger);
    this.connectionTracker = new ConnectionTracker(logger);
    // eslint-disable-next-line prefer-promise-reject-errors
    this.secureServer = Promise.reject();
    // eslint-disable-next-line prefer-promise-reject-errors
    this.insecureServer = Promise.reject();
    // eslint-disable-next-line prefer-promise-reject-errors
    this.initialisePromise = Promise.reject();
    this.store = store;
  }

  init() {
    const {insecure, secure} = this.store.getState().application.serverPorts;
    this.initialisePromise = this.certificateProvider
      .loadSecureServerConfig()
      .then(options => (this.secureServer = this.startServer(secure, options)))
      .then(() => {
        this.insecureServer = this.startServer(insecure);
        return;
      });
    reportPlatformFailures(this.initialisePromise, 'initializeServer');
    return this.initialisePromise;
  }

  startServer(
    port: number,
    sslConfig?: SecureServerConfig,
  ): Promise<RSocketServer<any, any>> {
    const server = this;
    return new Promise((resolve, reject) => {
      let rsServer: RSocketServer<any, any> | undefined; // eslint-disable-line prefer-const
      const serverFactory = (onConnect: (socket: Socket) => void) => {
        const transportServer = sslConfig
          ? tls.createServer(sslConfig, socket => {
              onConnect(socket);
            })
          : net.createServer(onConnect);
        transportServer
          .on('error', err => {
            server.emit('error', err);
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
            server.emit('listening', port);
            resolve(rsServer);
          });
        return transportServer;
      };
      rsServer = new RSocketServer({
        getRequestHandler: sslConfig
          ? this._trustedRequestHandler
          : this._untrustedRequestHandler,
        transport: new RSocketTCPServer({
          port: port,
          serverFactory: serverFactory,
        }),
      });
      rsServer && rsServer.start();
    });
  }

  _trustedRequestHandler = (
    socket: ReactiveSocket<string, any>,
    payload: Payload<string, any>,
  ): Partial<Responder<string, any>> => {
    const server = this;
    if (!payload.data) {
      return {};
    }
    const clientData: ClientQuery & ClientCsrQuery = JSON.parse(payload.data);
    this.connectionTracker.logConnectionAttempt(clientData);

    const {app, os, device, device_id, sdk_version, csr, csr_path} = clientData;

    const client: Promise<Client> = this.addConnection(
      socket,
      {app, os, device, device_id, sdk_version},
      {csr, csr_path},
    );

    socket.connectionStatus().subscribe({
      onNext(payload) {
        if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
          client.then(client => {
            console.debug(`Device disconnected ${client.id}`, 'server');
            server.removeConnection(client.id);
          });
        }
      },
      onSubscribe(subscription) {
        subscription.request(Number.MAX_SAFE_INTEGER);
      },
    });

    return {
      fireAndForget: (payload: {data: string}) =>
        client.then(client => {
          client.rIC(() => client.onMessage(payload.data), {
            timeout: 500,
          });
        }),
    };
  };

  _untrustedRequestHandler = (
    socket: ReactiveSocket<string, any>,
    payload: Payload<string, any>,
  ): Partial<Responder<string, any>> => {
    if (!payload.data) {
      return {};
    }
    const clientData: ClientQuery = JSON.parse(payload.data);
    this.connectionTracker.logConnectionAttempt(clientData);

    const client: UninitializedClient = {
      os: clientData.os,
      deviceName: clientData.device,
      appName: clientData.app,
    };
    this.emit('start-client-setup', client);

    return {
      requestResponse: (
        payload: Payload<string, any>,
      ): Single<Payload<string, any>> => {
        if (typeof payload.data !== 'string') {
          return new Single(_ => {});
        }

        let rawData;
        try {
          rawData = JSON.parse(payload.data);
        } catch (err) {
          console.error(
            `Invalid JSON: ${payload.data}`,
            'clientMessage',
            'server',
          );
          return new Single(_ => {});
        }

        const json: {
          method: 'signCertificate';
          csr: string;
          destination: string;
        } = rawData;
        if (json.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');

          const {csr, destination} = json;
          return new Single(subscriber => {
            subscriber.onSubscribe(undefined);
            reportPlatformFailures(
              this.certificateProvider.processCertificateSigningRequest(
                csr,
                clientData.os,
                destination,
              ),
              'processCertificateSigningRequest',
            )
              .then(result => {
                subscriber.onComplete({
                  data: JSON.stringify({
                    deviceId: result.deviceId,
                  }),
                  metadata: '',
                });
                this.emit('finish-client-setup', {
                  client,
                  deviceId: result.deviceId,
                });
              })
              .catch(e => {
                subscriber.onError(e);
                this.emit('client-setup-error', {client, error: e});
              });
          });
        }
        return new Single(_ => {});
      },

      // Leaving this here for a while for backwards compatibility,
      // but for up to date SDKs it will no longer used.
      // We can delete it after the SDK change has been using requestResponse for a few weeks.
      fireAndForget: (payload: Payload<string, any>) => {
        if (typeof payload.data !== 'string') {
          return;
        }

        let json:
          | {
              method: 'signCertificate';
              csr: string;
              destination: string;
            }
          | undefined;
        try {
          json = JSON.parse(payload.data);
        } catch (err) {
          console.error(`Invalid JSON: ${payload.data}`, 'server');
          return;
        }

        if (json && json.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');
          const {csr, destination} = json;
          this.certificateProvider
            .processCertificateSigningRequest(csr, clientData.os, destination)
            .catch(e => {
              console.error(e);
            });
        }
      },
    };
  };

  close(): Promise<void> {
    if (this.initialisePromise) {
      return this.initialisePromise.then(_ => {
        return Promise.all([
          this.secureServer.then(server => server.stop()),
          this.insecureServer.then(server => server.stop()),
        ]).then(() => undefined);
      });
    }
    return Promise.resolve();
  }

  toJSON() {
    return null;
  }

  async addConnection(
    conn: RSocketClientSocket<any, any>,
    query: ClientQuery,
    csrQuery: ClientCsrQuery,
  ): Promise<Client> {
    invariant(query, 'expected query');

    // try to get id by comparing giving `csr` to file from `csr_path`
    // otherwise, use given device_id
    const {csr_path, csr} = csrQuery;
    return (csr_path && csr
      ? this.certificateProvider.extractAppNameFromCSR(csr).then(appName => {
          return this.certificateProvider.getTargetDeviceId(
            query.os,
            appName,
            csr_path,
            csr,
          );
        })
      : Promise.resolve(query.device_id)
    ).then(csrId => {
      query.device_id = csrId;
      // in previous version (before 3), app may not appear in correct device
      // section because it refers to the name given by client which is not fixed
      // for android emulators, so it is indicated as outdated so that developers
      // might want to update SDK to get rid of this connection swap problem
      if (!query.sdk_version || query.sdk_version < 3) {
        query.app += ' (Outdated SDK)';
      }

      const id = `${query.app}#${query.os}#${query.device}#${csrId}`;
      console.debug(`Device connected: ${id}`, 'server');

      const client = new Client(id, query, conn, this.logger, this.store);

      const info = {
        client,
        connection: conn,
      };

      client.init().then(() => {
        console.debug(
          `Device client initialised: ${id}. Supported plugins: ${client.plugins.join(
            ', ',
          )}`,
          'server',
        );

        /* If a device gets disconnected without being cleaned up properly,
         * Flipper won't be aware until it attempts to reconnect.
         * When it does we need to terminate the zombie connection.
         */
        if (this.connections.has(id)) {
          const connectionInfo = this.connections.get(id);
          connectionInfo &&
            connectionInfo.connection &&
            connectionInfo.connection.close();
          this.removeConnection(id);
        }

        this.connections.set(id, info);
        this.emit('new-client', client);
        this.emit('clients-change');
        client.emit('plugins-change');
      });

      return client;
    });
  }

  attachFakeClient(client: Client) {
    this.connections.set(client.id, {
      client,
      connection: null,
    });
  }

  removeConnection(id: string) {
    const info = this.connections.get(id);
    if (info) {
      info.client.emit('close');
      this.connections.delete(id);
      this.emit('clients-change');
      this.emit('removed-client', id);
    }
  }
}

class ConnectionTracker {
  timeWindowMillis = 20 * 1000;
  connectionProblemThreshold = 4;

  // "${device}.${app}" -> [timestamp1, timestamp2...]
  connectionAttempts: Map<string, Array<number>> = new Map();
  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  logConnectionAttempt(client: ClientQuery) {
    const key = `${client.os}-${client.device}-${client.app}`;
    const time = Date.now();
    let entry = this.connectionAttempts.get(key) || [];
    entry.push(time);
    entry = entry.filter(t => t >= time - this.timeWindowMillis);

    this.connectionAttempts.set(key, entry);
    if (entry.length >= this.connectionProblemThreshold) {
      console.error(
        `Connection loop detected with ${key}. Connected ${
          this.connectionProblemThreshold
        } times within ${this.timeWindowMillis / 1000}s.`,
        'server',
      );
    }
  }
}

export default Server;
