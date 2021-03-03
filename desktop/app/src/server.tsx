/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  SecureServerConfig,
  CertificateExchangeMedium,
} from './utils/CertificateProvider';
import {Logger} from './fb-interfaces/Logger';
import {ClientQuery} from './Client';
import {Store, State} from './reducers/index';
import CertificateProvider from './utils/CertificateProvider';
import {RSocketServer} from 'rsocket-core';
import RSocketTCPServer from 'rsocket-tcp-server';
import Client from './Client';
import {FlipperClientConnection} from './Client';
import {UninitializedClient} from './UninitializedClient';
import {reportPlatformFailures} from './utils/metrics';
import {EventEmitter} from 'events';
import invariant from 'invariant';
import tls from 'tls';
import net, {Socket} from 'net';
import {Responder, Payload, ReactiveSocket} from 'rsocket-types';
import constants from './fb-stubs/constants';
import GK from './fb-stubs/GK';
import {initJsEmulatorIPC} from './utils/js-client-server-utils/serverUtils';
import {buildClientId} from './utils/clientUtils';
import {Single} from 'rsocket-flowable';
import WebSocket from 'ws';
import JSDevice from './devices/JSDevice';
import {WebsocketClientFlipperConnection} from './utils/js-client-server-utils/websocketClientFlipperConnection';
import querystring from 'querystring';
import {IncomingMessage} from 'http';
import ws from 'ws';
import {initSelfInpector} from './utils/self-inspection/selfInspectionUtils';
import ClientDevice from './devices/ClientDevice';
import BaseDevice from './devices/BaseDevice';
import {sideEffect} from './utils/sideEffect';
import {destroyDevice} from './reducers/connections';

type ClientInfo = {
  connection: FlipperClientConnection<any, any> | null | undefined;
  client: Client;
};

type ClientCsrQuery = {
  csr?: string | undefined;
  csr_path?: string | undefined;
};

function transformCertificateExchangeMediumToType(
  medium: number | undefined,
): CertificateExchangeMedium {
  if (medium == 1) {
    return 'FS_ACCESS';
  } else if (medium == 2) {
    return 'WWW';
  } else {
    return 'FS_ACCESS';
  }
}

declare interface Server {
  on(event: 'new-client', callback: (client: Client) => void): this;
  on(event: 'error', callback: (err: Error) => void): this;
  on(event: 'clients-change', callback: () => void): this;
}

function appNameWithUpdateHint(query: ClientQuery): string {
  // in previous version (before 3), app may not appear in correct device
  // section because it refers to the name given by client which is not fixed
  // for android emulators, so it is indicated as outdated so that developers
  // might want to update SDK to get rid of this connection swap problem
  if (query.os === 'Android' && (!query.sdk_version || query.sdk_version < 3)) {
    return query.app + ' (Outdated SDK)';
  }
  return query.app;
}

class Server extends EventEmitter {
  connections: Map<string, ClientInfo>;
  secureServer: Promise<RSocketServer<any, any>> | null;
  insecureServer: Promise<RSocketServer<any, any>> | null;
  certificateProvider: CertificateProvider;
  connectionTracker: ConnectionTracker;
  logger: Logger;
  store: Store;
  initialisePromise: Promise<void> | null;
  timeHandler: NodeJS.Timeout | undefined;
  constructor(logger: Logger, store: Store) {
    super();
    this.logger = logger;
    this.connections = new Map();
    this.certificateProvider = new CertificateProvider(this, logger, store);
    this.connectionTracker = new ConnectionTracker(logger);
    this.secureServer = null;
    this.insecureServer = null;
    this.initialisePromise = null;
    this.store = store;
    this.timeHandler = undefined;
  }

  init() {
    if (process.env.NODE_ENV === 'development') {
      initSelfInpector(this.store, this.logger, this, this.connections);
    }

    const {insecure, secure} = this.store.getState().application.serverPorts;
    this.initialisePromise = this.certificateProvider
      .loadSecureServerConfig()
      .then(
        (options) => (this.secureServer = this.startServer(secure, options)),
      )
      .then(() => {
        this.insecureServer = this.startServer(insecure);
        return;
      });
    if (GK.get('comet_enable_flipper_connection')) {
      this.startWsServer(8333);
    }
    reportPlatformFailures(this.initialisePromise, 'initializeServer');

    if (GK.get('flipper_js_client_emulator')) {
      initJsEmulatorIPC(this.store, this.logger, this, this.connections);
    }

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
          ? tls.createServer(sslConfig, (socket) => {
              onConnect(socket);
            })
          : net.createServer(onConnect);
        transportServer
          .on('error', (err) => {
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
            resolve(rsServer!);
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

  startWsServer(port: number) {
    const wss = new ws.Server({
      host: 'localhost',
      port,
      verifyClient: (info: {
        origin: string;
        req: IncomingMessage;
        secure: boolean;
      }) => {
        return constants.VALID_WEB_SOCKET_REQUEST_ORIGIN_PREFIXES.some(
          (validPrefix) => info.origin.startsWith(validPrefix),
        );
      },
    });
    wss.on('connection', (ws: WebSocket, message: any) => {
      const clients: {[app: string]: Promise<Client>} = {};
      const query = querystring.decode(message.url.split('?')[1]);
      const deviceId: string =
        typeof query.deviceId === 'string' ? query.deviceId : 'webbrowser';
      const device =
        typeof query.device === 'string' ? query.device : 'WebSocket';
      this.store.dispatch({
        type: 'REGISTER_DEVICE',
        payload: new JSDevice(deviceId, device, 1),
      });

      const cleanup = () => {
        Object.values(clients).map((p) =>
          p.then((c) => this.removeConnection(c.id)),
        );
        destroyDevice(this.store, this.logger, deviceId);
      };

      ws.on('message', (rawMessage: any) => {
        const message = JSON.parse(rawMessage.toString());
        switch (message.type) {
          case 'connect': {
            const app = message.app;
            const plugins = message.plugins;
            let resolvedClient: Client | null = null;
            const client = this.addConnection(
              new WebsocketClientFlipperConnection(ws, app, plugins),
              {
                app,
                os: 'JSWebApp',
                device: 'device',
                device_id: deviceId,
                // if plugins != null -> we are using old api, where we send the list of plugins with connect message
                sdk_version: plugins == null ? 4 : 1,
                medium: 'FS_ACCESS',
              },
              {},
            ).then((c) => (resolvedClient = c));
            clients[app] = client;

            ws.on('message', (m: any) => {
              const parsed = JSON.parse(m.toString());
              // non-null payload id means response to prev request, it's handled in connection
              if (parsed.app === app && parsed.payload?.id == null) {
                const message = JSON.stringify(parsed.payload);
                if (resolvedClient) {
                  resolvedClient.onMessage(message);
                } else {
                  client.then((c) => c.onMessage(message));
                }
              }
            });
            break;
          }
          case 'disconnect': {
            const app = message.app;
            (clients[app] || Promise.resolve()).then((c) => {
              this.removeConnection(c.id);
              delete clients[app];
            });
            break;
          }
        }
      });

      ws.on('close', () => {
        cleanup();
      });

      ws.on('error', (error) => {
        console.error('[server] ws connection error ', error);
        cleanup();
      });
    });
    wss.on('error', (_ws: WebSocket, e: any) => {
      console.error('error from wss' + e);
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
    if (this.timeHandler) {
      clearTimeout(this.timeHandler);
    }
    const clientData: ClientQuery &
      ClientCsrQuery & {medium: number | undefined} = JSON.parse(payload.data);
    this.logger.track('usage', 'trusted-request-handler-called', {
      app: clientData.app,
      os: clientData.os,
      device: clientData.device,
      device_id: clientData.device_id,
      medium: clientData.medium,
    });
    this.connectionTracker.logConnectionAttempt(clientData);

    const {
      app,
      os,
      device,
      device_id,
      sdk_version,
      csr,
      csr_path,
      medium,
    } = clientData;
    const transformedMedium = transformCertificateExchangeMediumToType(medium);
    if (transformedMedium === 'WWW') {
      this.store.dispatch({
        type: 'REGISTER_DEVICE',
        payload: new ClientDevice(device_id, app, os),
      });
    }

    const client: Promise<Client> = this.addConnection(
      socket,
      {
        app,
        os,
        device,
        device_id,
        sdk_version,
        medium: transformedMedium,
      },
      {csr, csr_path},
    ).then((client) => {
      return (resolvedClient = client);
    });
    let resolvedClient: Client | undefined;

    socket.connectionStatus().subscribe({
      onNext(payload) {
        if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
          client.then((client) => {
            console.log(`Device disconnected ${client.id}`, 'server', payload);
            server.removeConnection(client.id);
          });
        }
      },
      onSubscribe(subscription) {
        subscription.request(Number.MAX_SAFE_INTEGER);
      },
      onError(error) {
        console.error('[server] connection status error ', error);
      },
    });

    return {
      fireAndForget: (payload: {data: string}) => {
        if (resolvedClient) {
          resolvedClient.onMessage(payload.data);
        } else {
          client.then((client) => {
            client.onMessage(payload.data);
          });
        }
      },
    };
  };

  _untrustedRequestHandler = (
    _socket: ReactiveSocket<string, any>,
    payload: Payload<string, any>,
  ): Partial<Responder<string, any>> => {
    if (!payload.data) {
      return {};
    }
    const clientData: ClientQuery = JSON.parse(payload.data);
    this.logger.track('usage', 'untrusted-request-handler-called', clientData);

    this.connectionTracker.logConnectionAttempt(clientData);

    const client: UninitializedClient = {
      os: clientData.os,
      deviceName: clientData.device,
      appName: appNameWithUpdateHint(clientData),
    };
    this.emit('start-client-setup', client);

    return {
      requestResponse: (
        payload: Payload<string, any>,
      ): Single<Payload<string, any>> => {
        if (typeof payload.data !== 'string') {
          return new Single((_) => {});
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
          return new Single((_) => {});
        }

        const json: {
          method: 'signCertificate';
          csr: string;
          destination: string;
          medium: number | undefined; // OSS's older Client SDK might not send medium information. This is not an issue for internal FB users, as Flipper release is insync with client SDK through launcher.
        } = rawData;

        if (json.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');

          const {csr, destination, medium} = json;
          return new Single((subscriber) => {
            subscriber.onSubscribe(undefined);
            reportPlatformFailures(
              this.certificateProvider.processCertificateSigningRequest(
                csr,
                clientData.os,
                destination,
                transformCertificateExchangeMediumToType(medium),
              ),
              'processCertificateSigningRequest',
            )
              .then((result) => {
                subscriber.onComplete({
                  data: JSON.stringify({
                    deviceId: result.deviceId,
                  }),
                  metadata: '',
                });

                this.timeHandler = setTimeout(() => {
                  // Fire notification
                  this.emit('client-unresponsive-error', {
                    client,
                    medium: transformCertificateExchangeMediumToType(medium),
                    deviceID: result.deviceId,
                  });
                }, 30 * 1000);

                this.emit('finish-client-setup', {
                  client,
                  deviceId: result.deviceId,
                });
              })
              .catch((e) => {
                subscriber.onError(e);
                this.emit('client-setup-error', {client, error: e});
              });
          });
        }
        return new Single((_) => {});
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
              medium: number | undefined;
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
          const {csr, destination, medium} = json;
          this.certificateProvider
            .processCertificateSigningRequest(
              csr,
              clientData.os,
              destination,
              transformCertificateExchangeMediumToType(medium),
            )
            .catch((e) => {
              console.error(e);
            });
        }
      },
    };
  };

  close(): Promise<void> {
    if (this.initialisePromise) {
      return this.initialisePromise.then((_) => {
        return Promise.all([
          this.secureServer &&
            this.secureServer.then((server) => server.stop()),
          this.insecureServer &&
            this.insecureServer.then((server) => server.stop()),
        ]).then(() => undefined);
      });
    }
    return Promise.resolve();
  }

  toJSON() {
    return null;
  }

  async addConnection(
    conn: FlipperClientConnection<any, any>,
    query: ClientQuery & {medium: CertificateExchangeMedium},
    csrQuery: ClientCsrQuery,
  ): Promise<Client> {
    invariant(query, 'expected query');

    // try to get id by comparing giving `csr` to file from `csr_path`
    // otherwise, use given device_id
    const {csr_path, csr} = csrQuery;
    // For iOS we do not need to confirm the device id, as it never changes unlike android.
    return (csr_path && csr && query.os != 'iOS'
      ? this.certificateProvider.extractAppNameFromCSR(csr).then((appName) => {
          return this.certificateProvider.getTargetDeviceId(
            query.os,
            appName,
            csr_path,
            csr,
          );
        })
      : Promise.resolve(query.device_id)
    ).then(async (csrId) => {
      query.device_id = csrId;
      query.app = appNameWithUpdateHint(query);

      const id = buildClientId({
        app: query.app,
        os: query.os,
        device: query.device,
        device_id: csrId,
      });
      console.debug(`Device connected: ${id}`, 'server');

      const device =
        getDeviceBySerial(this.store.getState(), query.device_id) ??
        (await findDeviceForConnection(this.store, query.app, query.device_id));
      const client = new Client(
        id,
        query,
        conn,
        this.logger,
        this.store,
        undefined,
        device,
      );

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
      info.client.disconnect();
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
    entry = entry.filter((t) => t >= time - this.timeWindowMillis);

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

function getDeviceBySerial(
  state: State,
  serial: string,
): BaseDevice | undefined {
  return state.connections.devices.find((device) => device.serial === serial);
}

async function findDeviceForConnection(
  store: Store,
  clientId: string,
  serial: string,
): Promise<BaseDevice> {
  let lastSeenDeviceList: BaseDevice[] = [];
  /* All clients should have a corresponding Device in the store.
     However, clients can connect before a device is registered, so wait a
     while for the device to be registered if it isn't already. */
  return reportPlatformFailures(
    new Promise<BaseDevice>((resolve, reject) => {
      let unsubscribe: () => void = () => {};

      const timeout = setTimeout(() => {
        unsubscribe();
        const error = `Timed out waiting for device ${serial} for client ${clientId}`;
        console.error(error);
        reject(error);
      }, 15000);
      unsubscribe = sideEffect(
        store,
        {name: 'waitForDevice', throttleMs: 100},
        (state) => state.connections.devices,
        (newDeviceList) => {
          if (newDeviceList === lastSeenDeviceList) {
            return;
          }
          lastSeenDeviceList = newDeviceList;
          const matchingDevice = newDeviceList.find(
            (device) => device.serial === serial,
          );
          if (matchingDevice) {
            clearTimeout(timeout);
            resolve(matchingDevice);
            unsubscribe();
          }
        },
      );
    }),
    'client-setMatchingDevice',
  );
}

export default Server;
