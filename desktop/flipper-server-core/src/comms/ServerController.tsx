/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CertificateExchangeMedium} from '../utils/CertificateProvider';
import {Logger} from 'flipper-common';
import {
  ClientDescription,
  ClientQuery,
  isTest,
  GK,
  buildClientId,
} from 'flipper-common';
import CertificateProvider from '../utils/CertificateProvider';
import {ClientConnection, ConnectionStatus} from './ClientConnection';
import {UninitializedClient} from 'flipper-common';
import {reportPlatformFailures} from 'flipper-common';
import {EventEmitter} from 'events';
import invariant from 'invariant';
import DummyDevice from '../devices/DummyDevice';
import {
  appNameWithUpdateHint,
  transformCertificateExchangeMediumToType,
} from './Utilities';
import ServerAdapter, {
  SecureClientQuery,
  ServerEventsListener,
} from './ServerAdapter';
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

type ClientInfo = {
  connection: ClientConnection | null | undefined;
  client: ClientDescription;
};

type ClientCsrQuery = {
  csr?: string | undefined;
  csr_path?: string | undefined;
};

declare interface ServerController {
  on(event: 'error', callback: (err: Error) => void): this;
}

/**
 * Responsible of creating and managing the actual underlying servers:
 * - Insecure (used for certificate exchange)
 * - Secure (used for secure communication between the client and server)
 * - Browser (only ever used between Desktop and a local Browser)
 *
 * Additionally, it manages client connections.
 */
class ServerController extends EventEmitter implements ServerEventsListener {
  connections: Map<string, ClientInfo>;

  initialized: Promise<void> | null;
  secureServer: Promise<ServerAdapter> | null;
  insecureServer: Promise<ServerAdapter> | null;
  altSecureServer: Promise<ServerAdapter> | null;
  altInsecureServer: Promise<ServerAdapter> | null;
  browserServer: Promise<ServerAdapter> | null;

  certificateProvider: CertificateProvider;
  connectionTracker: ConnectionTracker;

  flipperServer: FlipperServerImpl;

  timeHandlers: Map<string, NodeJS.Timeout> = new Map();

  constructor(flipperServer: FlipperServerImpl) {
    super();
    this.flipperServer = flipperServer;
    this.connections = new Map();
    this.certificateProvider = new CertificateProvider(
      this,
      this.logger,
      getFlipperServerConfig(),
    );
    this.connectionTracker = new ConnectionTracker(this.logger);
    this.secureServer = null;
    this.insecureServer = null;
    this.altSecureServer = null;
    this.altInsecureServer = null;
    this.browserServer = null;
    this.initialized = null;
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
  init() {
    if (isTest()) {
      throw new Error('Spawing new server is not supported in test');
    }
    const {insecure, secure} = getServerPortsConfig().serverPorts;

    this.initialized = this.certificateProvider
      .loadSecureServerConfig()
      .then((options) => {
        console.info('[conn] secure server listening at port: ', secure);
        this.secureServer = createServer(secure, this, options);
        if (GK.get('flipper_websocket_server')) {
          const {secure: altSecure} = getServerPortsConfig().altServerPorts;
          console.info(
            '[conn] secure server (ws) listening at port: ',
            altSecure,
          );
          this.altSecureServer = createServer(
            altSecure,
            this,
            options,
            TransportType.WebSocket,
          );
        }
      })
      .then(() => {
        console.info('[conn] insecure server listening at port: ', insecure);
        this.insecureServer = createServer(insecure, this);
        if (GK.get('flipper_websocket_server')) {
          const {insecure: altInsecure} = getServerPortsConfig().altServerPorts;
          console.info(
            '[conn] insecure server (ws) listening at port: ',
            altInsecure,
          );
          this.altInsecureServer = createServer(
            altInsecure,
            this,
            undefined,
            TransportType.WebSocket,
          );
        }
        return;
      });

    if (GK.get('comet_enable_flipper_connection')) {
      this.browserServer = createBrowserServer(8333, this);
    }

    reportPlatformFailures(this.initialized, 'initializeServer');

    return this.initialized;
  }

  /**
   * If initialized, it stops any started servers.
   */
  async close() {
    if (this.initialized && (await this.initialized)) {
      await Promise.all([
        this.insecureServer && (await this.insecureServer).stop(),
        this.secureServer && (await this.secureServer).stop(),
        this.altInsecureServer && (await this.altInsecureServer).stop(),
        this.altSecureServer && (await this.altSecureServer).stop(),
        this.browserServer && (await this.browserServer).stop(),
      ]);
    }
  }

  onConnectionCreated(
    clientQuery: SecureClientQuery,
    clientConnection: ClientConnection,
  ): Promise<ClientDescription> {
    const {app, os, device, device_id, sdk_version, csr, csr_path, medium} =
      clientQuery;
    const transformedMedium = transformCertificateExchangeMediumToType(medium);
    console.info(
      `[conn] Connection established: ${app} on ${device_id}. Medium ${medium}. CSR: ${csr_path}`,
      clientQuery,
    );
    return this.addConnection(
      clientConnection,
      {
        app,
        os,
        device,
        device_id,
        sdk_version,
        medium: transformedMedium,
      },
      {csr, csr_path},
    );
  }

  onConnectionClosed(clientId: string) {
    this.removeConnection(clientId);
  }

  onListening(port: number): void {
    this.emit('listening', port);
  }

  onSecureConnectionAttempt(clientQuery: SecureClientQuery): void {
    this.logger.track('usage', 'trusted-request-handler-called', clientQuery);

    const {os, app, device_id} = clientQuery;
    // without these checks, the user might see a connection timeout error instead, which would be much harder to track down
    if (os === 'iOS' && !getFlipperServerConfig().enableIOS) {
      console.error(
        `Refusing connection from ${app} on ${device_id}, since iOS support is disabled in settings`,
      );
      return;
    }
    if (os === 'Android' && !getFlipperServerConfig().enableAndroid) {
      console.error(
        `Refusing connection from ${app} on ${device_id}, since Android support is disabled in settings`,
      );
      return;
    }

    this.connectionTracker.logConnectionAttempt(clientQuery);

    if (this.timeHandlers.get(clientQueryToKey(clientQuery))) {
      clearTimeout(this.timeHandlers.get(clientQueryToKey(clientQuery))!);
    }

    const transformedMedium = transformCertificateExchangeMediumToType(
      clientQuery.medium,
    );
    if (transformedMedium === 'WWW' || transformedMedium === 'NONE') {
      this.flipperServer.registerDevice(
        new DummyDevice(
          this.flipperServer,
          clientQuery.device_id,
          clientQuery.app +
            (transformedMedium === 'WWW' ? ' Server Exchanged' : ''),
          clientQuery.os,
        ),
      );
    }
  }

  onConnectionAttempt(clientQuery: ClientQuery): void {
    this.logger.track('usage', 'untrusted-request-handler-called', clientQuery);
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
    medium: CertificateExchangeMedium,
  ): Promise<{deviceId: string}> {
    return new Promise((resolve, reject) => {
      reportPlatformFailures(
        this.certificateProvider.processCertificateSigningRequest(
          unsanitizedCSR,
          clientQuery.os,
          appDirectory,
          medium,
        ),
        'processCertificateSigningRequest',
      )
        .then((response) => {
          const client: UninitializedClient = {
            os: clientQuery.os,
            deviceName: clientQuery.device,
            appName: appNameWithUpdateHint(clientQuery),
          };
          // TODO: if multiple clients are establishing a connection
          // at the same time, then this unresponsive timeout can potentially
          // lead to errors. For example, client A starts connectiving followed
          // by client B. Client B timeHandler will override client A, thus, if
          // client A takes longer, then the unresponsive timeout will not be called
          // for it.
          this.timeHandlers.set(
            clientQueryToKey(clientQuery),
            setTimeout(() => {
              this.emit('client-unresponsive-error', {
                client,
                medium,
                deviceID: response.deviceId,
              });
            }, 30 * 1000),
          );

          resolve(response);
        })
        .catch((error) => {
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

  /**
   * Creates a Client and sets the underlying connection.
   * @param connection A client connection to communicate between server and client.
   * @param query The client query created from the initial handshake.
   * @param csrQuery The CSR query which contains CSR related information.
   */
  async addConnection(
    connection: ClientConnection,
    query: ClientQuery & {medium: CertificateExchangeMedium},
    csrQuery: ClientCsrQuery,
  ): Promise<ClientDescription> {
    invariant(query, 'expected query');

    // try to get id by comparing giving `csr` to file from `csr_path`
    // otherwise, use given device_id
    const {csr_path, csr} = csrQuery;

    // For Android, device id might change
    if (csr_path && csr && query.os === 'Android') {
      const app_name = await this.certificateProvider.extractAppNameFromCSR(
        csr,
      );
      // TODO: allocate new object, kept now as is to keep changes minimal
      (query as any).device_id =
        await this.certificateProvider.getTargetDeviceId(
          query.os,
          app_name,
          csr_path,
          csr,
        );
      console.info(
        `[conn] Detected ${app_name} on ${query.device_id} in certificate`,
        query,
        csrQuery,
      );
    }

    // TODO: allocate new object, kept now as is to keep changes minimal
    (query as any).app = appNameWithUpdateHint(query);

    const id = buildClientId({
      app: query.app,
      os: query.os,
      device: query.device,
      device_id: query.device_id,
    });
    console.info(
      `[conn] Matching device for ${query.app} on ${query.device_id}...`,
      query,
      csrQuery,
    );

    const client: ClientDescription = {
      id,
      query,
    };

    const info = {
      client,
      connection: connection,
    };

    console.info(
      `[conn] Initializing client ${query.app} on ${query.device_id}...`,
      query,
      csrQuery,
    );

    connection.subscribeToEvents((status: ConnectionStatus) => {
      if (
        status === ConnectionStatus.CLOSED ||
        status === ConnectionStatus.ERROR
      ) {
        this.onConnectionClosed(client.id);
      }
    });

    console.debug(
      `[conn] Device client initialized: ${id}.`,
      'server',
      query,
      csrQuery,
    );

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
          connectionInfo.connection.close();
          this.removeConnection(id);
        }
      }
    }

    this.connections.set(id, info);
    this.flipperServer.emit('client-connected', client);

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
    const info = this.connections.get(id);
    if (info) {
      console.info(
        `[conn] Disconnected: ${info.client.query.app} on ${info.client.query.device_id}.`,
        info.client.query,
      );
      this.flipperServer.emit('client-disconnected', {id});
      this.connections.delete(id);
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
        `[conn] Connection loop detected with ${key}. Connected ${
          this.connectionProblemThreshold
        } times within ${this.timeWindowMillis / 1000}s.`,
        'server',
        client,
      );
    }
  }
}

export default ServerController;

function clientQueryToKey(clientQuery: ClientQuery): string {
  return `${clientQuery.app}/${clientQuery.os}/${clientQuery.device}/${clientQuery.device_id}`;
}
