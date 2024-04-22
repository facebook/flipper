/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ClientDescription,
  ClientQuery,
  SecureClientQuery,
  isTest,
  buildClientId,
  Logger,
  UninitializedClient,
  reportPlatformFailures,
  FlipperServerEvents,
  ConnectionRecordEntry,
  uuid,
} from 'flipper-common';
import CertificateProvider, {
  CertificateExchangeRequestResult,
} from './certificate-exchange/CertificateProvider';
import {ClientConnection, ConnectionStatus} from './ClientConnection';
import {EventEmitter} from 'events';
import invariant from 'invariant';
import DummyDevice from '../devices/DummyDevice';
import {appNameWithUpdateHint, assertNotNull} from './Utilities';
import ServerWebSocketBase, {
  CertificateExchangeRequestResponse,
  ServerEventsListener,
} from './ServerWebSocketBase';
import {
  createBrowserServer,
  createServer,
  TransportType,
} from './ServerFactory';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {
  getServerPortsConfig,
  getFlipperServerConfig,
} from '../FlipperServerConfig';
import {
  extractBundleIdFromCSR,
  loadSecureServerConfig,
} from './certificate-exchange/certificate-utils';
import DesktopCertificateProvider from '../devices/desktop/DesktopCertificateProvider';
import WWWCertificateProvider from '../fb-stubs/WWWCertificateProvider';
import {tracker} from '../tracker';
import {recorder} from '../recorder';
import GK from '../fb-stubs/GK';

type ClientTimestampTracker = {
  insecureStart?: number;
  secureStart?: number;
};

type ClientInfo = {
  connection: ClientConnection | null | undefined;
  client: ClientDescription;
};

/**
 * Responsible of creating and managing the actual underlying servers:
 * - Insecure (used for certificate exchange)
 * - Secure (used for secure communication between the client and server)
 * - Browser (only ever used between Desktop and a local Browser)
 *
 * Additionally, it manages client connections.
 */
export class ServerController
  extends EventEmitter
  implements ServerEventsListener
{
  connections: Map<string, ClientInfo> = new Map();
  timestamps: Map<string, ClientTimestampTracker> = new Map();

  secureServer: ServerWebSocketBase | null = null;
  insecureServer: ServerWebSocketBase | null = null;
  altSecureServer: ServerWebSocketBase | null = null;
  altInsecureServer: ServerWebSocketBase | null = null;
  browserServer: ServerWebSocketBase | null = null;

  connectionTracker: ConnectionTracker;

  flipperServer: FlipperServerImpl;

  timeHandlers: Map<string, NodeJS.Timeout> = new Map();

  constructor(flipperServer: FlipperServerImpl) {
    super();
    this.flipperServer = flipperServer;
    this.connectionTracker = new ConnectionTracker(this.logger);

    recorder.enable(flipperServer);
  }
  onClientMessage(clientId: string, payload: string): void {
    this.flipperServer.emit('client-message', {
      id: clientId,
      message: payload,
    });
  }

  get logger(): Logger {
    return this.flipperServer.logger;
  }

  /**
   * Loads the secure server configuration and starts any necessary servers.
   * Initialisation is complete once the initialized promise is fullfilled at
   * which point Flipper is accepting connections.
   */
  async init() {
    if (isTest()) {
      throw new Error('Spawing new server is not supported in test');
    }
    const {insecure, secure} = getServerPortsConfig().serverPorts;

    const options = await loadSecureServerConfig();

    console.info('[ws] secure server listening at port: ', secure);
    this.secureServer = await createServer(secure, this, options);
    const {secure: altSecure} = getServerPortsConfig().altServerPorts;
    console.info('[ws] secure server listening at port: ', altSecure);
    this.altSecureServer = await createServer(
      altSecure,
      this,
      options,
      TransportType.WebSocket,
    );

    console.info('[ws] insecure server listening at port: ', insecure);
    this.insecureServer = await createServer(insecure, this);
    const {insecure: altInsecure} = getServerPortsConfig().altServerPorts;
    console.info('[ws] insecure server listening at port: ', altInsecure);
    this.altInsecureServer = await createServer(
      altInsecure,
      this,
      undefined,
      TransportType.WebSocket,
    );

    const browserPort = getServerPortsConfig().browserPort;
    console.info('[ws] Browser server listening at port: ', browserPort);
    this.browserServer = await createBrowserServer(browserPort, this);
  }

  /**
   * If initialized, it stops any started servers.
   */
  async close() {
    await Promise.all([
      this.insecureServer?.stop(),
      this.secureServer?.stop(),
      this.altInsecureServer?.stop(),
      this.altSecureServer?.stop(),
      this.browserServer?.stop(),
    ]);
  }

  onDeviceLogs(logs: ConnectionRecordEntry[]) {
    recorder.logConnectionRecordEntries(logs);
  }

  onConnectionCreated(
    clientQuery: SecureClientQuery,
    clientConnection: ClientConnection,
    downgrade?: boolean,
  ): Promise<ClientDescription> {
    const {
      app,
      os,
      device,
      device_id,
      sdk_version,
      csr,
      csr_path,
      medium,
      rsocket,
    } = clientQuery;

    recorder.log(clientQuery, 'Connection established');
    tracker.track('app-connection-created', {
      app,
      os,
      device,
      device_id,
      medium,
    });

    return this.addConnection(
      clientConnection,
      {
        app,
        os,
        device,
        device_id,
        sdk_version,
        medium,
        rsocket,
        csr,
        csr_path,
      },
      downgrade,
    );
  }

  onConnectionClosed(clientId: string) {
    this.removeConnection(clientId);
  }

  onListening(port: number): void {
    this.emit('listening', port);
  }

  onSecureConnectionAttempt(clientQuery: SecureClientQuery): void {
    const strippedClientQuery = (({device_id, ...o}) => o)(clientQuery);
    let id = buildClientId({device_id: 'unknown', ...strippedClientQuery});
    const timestamp = this.timestamps.get(id);
    if (timestamp) {
      this.timestamps.delete(id);
    }
    id = buildClientId(clientQuery);
    this.timestamps.set(id, {
      secureStart: Date.now(),
      ...timestamp,
    });

    tracker.track('app-connection-secure-attempt', {
      app: clientQuery.app,
      os: clientQuery.os,
      device: clientQuery.device,
      device_id: clientQuery.device_id,
      medium: clientQuery.medium,
    });

    // Without these checks, the user might see a connection timeout error instead,
    // which would be much harder to track down
    if (
      clientQuery.os === 'iOS' &&
      !getFlipperServerConfig().settings.enableIOS
    ) {
      recorder.logError(
        clientQuery,
        `Refusing connection since iOS support is disabled in settings`,
      );
      return;
    }
    if (
      clientQuery.os === 'Android' &&
      !getFlipperServerConfig().settings.enableAndroid
    ) {
      recorder.logError(
        clientQuery,
        `Refusing connection since Android support is disabled in settings`,
      );
      return;
    }

    this.connectionTracker.logConnectionAttempt(clientQuery);

    const timeout = this.timeHandlers.get(clientQueryToKey(clientQuery));
    if (timeout) {
      clearTimeout(timeout);
    }

    const device = this.flipperServer.getDeviceWithSerial(
      clientQuery.device_id,
    );
    if (!device) {
      this.flipperServer.registerDevice(
        new DummyDevice(
          this.flipperServer,
          clientQuery.device_id,
          `${clientQuery.device}`,
          clientQuery.os,
        ),
      );
    }

    const client: UninitializedClient = {
      os: clientQuery.os,
      deviceName: clientQuery.device,
      appName: appNameWithUpdateHint(clientQuery),
    };

    this.emit('start-client-setup', client);
  }

  /**
   * A connection has been established between a running app and Flipper Desktop.
   * The connection sole purpose is to perform the certificate exchange.
   * @param clientQuery Client query defines the arguments passed down from the app
   * to Flipper Desktop.
   */
  onConnectionAttempt(clientQuery: ClientQuery): void {
    // Remove the device id from the query, if found.
    // Instead, set the device id as 'unknown'.
    const strippedClientQuery = (({device_id, ...o}) => o)(clientQuery);
    const id = buildClientId({device_id: 'unknown', ...strippedClientQuery});

    this.timestamps.set(id, {
      insecureStart: Date.now(),
    });

    tracker.track('app-connection-insecure-attempt', clientQuery);
    recorder.log(clientQuery, 'Insecure connection attempt');

    this.connectionTracker.logConnectionAttempt(clientQuery);

    const client: UninitializedClient = {
      os: clientQuery.os,
      deviceName: clientQuery.device,
      appName: appNameWithUpdateHint(clientQuery),
    };
    this.emit('start-client-setup', client);
  }

  onProcessCSR(
    unsanitizedCSR: string,
    clientQuery: ClientQuery,
    appDirectory: string,
  ): Promise<CertificateExchangeRequestResponse> {
    let certificateProvider: CertificateProvider;
    switch (clientQuery.os) {
      case 'Android': {
        assertNotNull(
          this.flipperServer.android,
          'Android settings have not been provided / enabled',
        );
        certificateProvider = this.flipperServer.android.certificateProvider;
        break;
      }
      case 'iOS': {
        assertNotNull(
          this.flipperServer.ios,
          'iOS settings have not been provided / enabled',
        );
        certificateProvider = this.flipperServer.ios.certificateProvider;

        if (clientQuery.medium === 'WWW') {
          certificateProvider = new WWWCertificateProvider(
            this.flipperServer.keytarManager,
          );
        }
        break;
      }
      // Used by Spark AR studio (search for SkylightFlipperClient)
      // See D30992087
      case 'MacOS':
      case 'Windows': {
        certificateProvider = new DesktopCertificateProvider();
        break;
      }
      default: {
        throw new Error(
          `OS '${clientQuery.os}' does not support certificate exchange.`,
        );
      }
    }

    certificateProvider.verifyMedium(clientQuery.medium);

    recorder.log(clientQuery, 'Certificate Signing Request being processed');

    return new Promise((resolve, reject) => {
      reportPlatformFailures(
        certificateProvider.processCertificateSigningRequest(
          clientQuery,
          unsanitizedCSR,
          appDirectory,
        ),
        'processCertificateSigningRequest',
      )
        .then((result: CertificateExchangeRequestResult) => {
          const shouldSendEncryptedCertificates =
            GK.get('flipper_encrypted_exchange') && clientQuery.os === 'iOS';

          const client: UninitializedClient = {
            os: clientQuery.os,
            deviceName: clientQuery.device,
            appName: appNameWithUpdateHint(clientQuery),
          };

          if (!result.error) {
            recorder.log(
              clientQuery,
              'Certificate Signing Request successfully processed',
            );

            this.timeHandlers.set(
              // In the original insecure connection request, `device_id` is set to "unknown".
              // Flipper queries adb/idb to learn the device ID and provides it back to the app.
              // Once app knows it, it starts using the correct device ID for its subsequent secure connections.
              // When the app re-connects securely after the certificate exchange process, we need to cancel this timeout.
              // Since the original clientQuery has `device_id` set to "unknown", we update it here with the correct `device_id` to find it and cancel it later.
              clientQueryToKey({...clientQuery, device_id: result.deviceId}),
              setTimeout(() => {
                this.emit('client-unresponsive-error', {
                  client,
                  medium: clientQuery.medium,
                  deviceID: result.deviceId,
                });
              }, 30 * 1000),
            );

            tracker.track('app-connection-certificate-exchange', {
              ...clientQuery,
              successful: true,
              device_id: result.deviceId,
            });

            const response: CertificateExchangeRequestResponse = {
              deviceId: result.deviceId,
            };

            resolve(response);
          } else if (shouldSendEncryptedCertificates) {
            recorder.log(
              clientQuery,
              'Certificate Signing Request failed, attempt fallback exchange',
            );

            this.emit(
              'client-setup-secret-exchange',
              client,
              result.certificates?.key,
            );

            let deviceId = uuid();
            const device = this.flipperServer.getDeviceWithName(
              clientQuery.device,
            );
            if (device) {
              deviceId = device.serial;
            } else {
              this.flipperServer.registerDevice(
                new DummyDevice(
                  this.flipperServer,
                  deviceId,
                  `${clientQuery.device} via QR Exchange`,
                  clientQuery.os,
                ),
              );
            }

            tracker.track('app-connection-insecure-attempt-fallback', {
              app: clientQuery.app,
              os: clientQuery.os,
              device: clientQuery.device,
              medium: clientQuery.medium,
              device_id: deviceId,
            });

            const response: CertificateExchangeRequestResponse = {
              deviceId,
              certificates: result.certificates?.data,
            };

            resolve(response);
          } else {
            throw result.error;
          }
        })
        .catch((error: Error) => {
          tracker.track('app-connection-certificate-exchange', {
            ...clientQuery,
            successful: false,
            error: error.message,
          });
          reject(error);
        });
    });
  }

  onError(error: Error): void {
    this.emit('error', error);
  }

  toJSON() {
    return null;
  }

  onClientSetupError(clientQuery: ClientQuery, error: Error) {
    recorder.logError(clientQuery, 'Failed to exchange certificate', error);
    const client: UninitializedClient = {
      os: clientQuery.os,
      deviceName: clientQuery.device,
      appName: appNameWithUpdateHint(clientQuery),
    };
    this.emit('client-setup-error', {client, error});
  }

  /**
   * Creates a Client and sets the underlying connection.
   * @param connection A client connection to communicate between server and client.
   * @param clientQuery The client query created from the initial handshake.
   * @param csrQuery The CSR query which contains CSR related information.
   */
  async addConnection(
    connection: ClientConnection,
    clientQuery: SecureClientQuery,
    silentReplace?: boolean,
  ): Promise<ClientDescription> {
    invariant(clientQuery, 'expected query');

    // try to get id by comparing giving `csr` to file from `csr_path`
    // otherwise, use given device_id.
    const {csr_path, csr} = clientQuery;

    // For Android, device id might change
    if (csr_path && csr && clientQuery.os === 'Android') {
      const bundleId = await extractBundleIdFromCSR(csr);
      assertNotNull(this.flipperServer.android);
      (clientQuery as any).device_id =
        await this.flipperServer.android.certificateProvider.getTargetDeviceId(
          clientQuery,
          bundleId,
          csr_path,
          csr,
        );
      recorder.log(
        clientQuery,
        `Detected ${bundleId} on ${clientQuery.device_id} in certificate`,
      );
    }

    (clientQuery as any).app = appNameWithUpdateHint(clientQuery);

    const id = buildClientId(clientQuery);
    recorder.log(
      clientQuery,
      `Matching device for ${clientQuery.app} on ${clientQuery.device_id}`,
    );

    const client: ClientDescription = {
      id,
      query: clientQuery,
    };

    const info = {
      client,
      connection,
    };

    recorder.log(
      clientQuery,
      `Initializing client ${clientQuery.app} on ${clientQuery.device_id}`,
    );

    connection.subscribeToEvents((status: ConnectionStatus) => {
      if (
        status === ConnectionStatus.CLOSED ||
        status === ConnectionStatus.ERROR
      ) {
        this.onConnectionClosed(client.id);
      }
    });

    recorder.log(clientQuery, `Device client initialized: ${id}`);

    /* If a device gets disconnected without being cleaned up properly,
     * Flipper won't be aware until it attempts to reconnect.
     * When it does we need to terminate the zombie connection.
     */
    if (this.connections.has(id)) {
      const connectionInfo = this.connections.get(id);
      if (connectionInfo) {
        if (
          connectionInfo.connection &&
          connectionInfo.connection !== connection
        ) {
          if (!silentReplace) {
            connectionInfo.connection.close();
          }
          this.removeConnection(id);
        }
      }
    }

    this.connections.set(id, info);
    this.flipperServer.emit('client-connected', client);

    const tracker = this.timestamps.get(id);
    if (tracker) {
      const end = Date.now();
      const start = tracker.insecureStart
        ? tracker.insecureStart
        : tracker.secureStart;

      if (start) {
        const elapsed = Math.round(end - start);
        this.logger.track('performance', 'client-connection-tracker', {
          'time-to-connection': elapsed,
          ...clientQuery,
        });
        this.timestamps.delete(id);
      }
    }

    return client;
  }

  attachFakeClient(client: ClientDescription) {
    this.connections.set(client.id, {
      client,
      connection: null,
    });
  }

  /**
   * Removes a client connection by disconnecting it, if still connected
   * and then deleting it from the tracked connections.
   * @param id The client connection identifier.
   */
  removeConnection(id: string) {
    const connectionInfo = this.connections.get(id);
    if (connectionInfo) {
      recorder.log(
        connectionInfo.client.query,
        `Disconnected: ${connectionInfo.client.query.app} on ${connectionInfo.client.query.device_id}.`,
      );

      const device = this.flipperServer.getDeviceWithSerial(
        connectionInfo.client.query.device_id,
      );

      this.flipperServer.emit('client-disconnected', {id});
      this.connections.delete(id);
      this.flipperServer.pluginManager.stopAllServerAddOns(id);

      if (device && device.info.deviceType === 'dummy') {
        this.flipperServer.unregisterDevice(device.serial);
      }
    }
  }

  onDeprecationNotice(message: string) {
    const notification: FlipperServerEvents['notification'] = {
      type: 'warning',
      title: 'Deprecation notice',
      description: message,
    };
    this.flipperServer.emit('notification', notification);
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

  logConnectionAttempt(clientQuery: ClientQuery) {
    const key = `${clientQuery.os}-${clientQuery.device}-${clientQuery.app}`;
    const time = Date.now();

    let entry = this.connectionAttempts.get(key) || [];
    entry.push(time);
    entry = entry.filter((t) => t >= time - this.timeWindowMillis);

    this.connectionAttempts.set(key, entry);
    if (entry.length >= this.connectionProblemThreshold) {
      recorder.logError(
        clientQuery,
        `Connection loop detected with ${key}. Connected ${
          this.connectionProblemThreshold
        } times within ${this.timeWindowMillis / 1000}s.`,
      );
    }
  }
}

function clientQueryToKey(clientQuery: ClientQuery): string {
  return `${clientQuery.app}/${clientQuery.os}/${clientQuery.device}/${clientQuery.device_id}`;
}
