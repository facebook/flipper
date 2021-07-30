/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CertificateExchangeMedium} from '../utils/CertificateProvider';
import {Logger} from '../fb-interfaces/Logger';
import {ClientQuery} from '../Client';
import {Store, State} from '../reducers/index';
import CertificateProvider from '../utils/CertificateProvider';
import Client from '../Client';
import {ClientConnection, ConnectionStatus} from './ClientConnection';
import {UninitializedClient} from '../UninitializedClient';
import {reportPlatformFailures} from '../utils/metrics';
import {EventEmitter} from 'events';
import invariant from 'invariant';
import GK from '../fb-stubs/GK';
import {initJsEmulatorIPC} from '../utils/js-client-server-utils/serverUtils';
import {buildClientId} from '../utils/clientUtils';
import JSDevice from '../devices/JSDevice';
import DummyDevice from '../devices/DummyDevice';
import BaseDevice from '../devices/BaseDevice';
import {sideEffect} from '../utils/sideEffect';
import {
  appNameWithUpdateHint,
  transformCertificateExchangeMediumToType,
} from './Utilities';
import ServerAdapter, {
  SecureClientQuery,
  ServerEventsListener,
} from './ServerAdapter';
import {createBrowserServer, createServer} from './ServerFactory';

type ClientInfo = {
  connection: ClientConnection | null | undefined;
  client: Client;
};

type ClientCsrQuery = {
  csr?: string | undefined;
  csr_path?: string | undefined;
};

declare interface ServerController {
  on(event: 'new-client', callback: (client: Client) => void): this;
  on(event: 'error', callback: (err: Error) => void): this;
  on(event: 'clients-change', callback: () => void): this;
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
  browserServer: Promise<ServerAdapter> | null;

  certificateProvider: CertificateProvider;
  connectionTracker: ConnectionTracker;

  logger: Logger;
  store: Store;

  timeHandler: NodeJS.Timeout | undefined;

  constructor(logger: Logger, store: Store) {
    super();
    this.logger = logger;
    this.connections = new Map();
    this.certificateProvider = new CertificateProvider(this, logger, store);
    this.connectionTracker = new ConnectionTracker(logger);
    this.secureServer = null;
    this.insecureServer = null;
    this.browserServer = null;
    this.initialized = null;
    this.store = store;
    this.timeHandler = undefined;
  }

  /**
   * Loads the secure server configuration and starts any necessary servers.
   * Initialisation is complete once the initialized promise is fullfilled at
   * which point Flipper is accepting connections.
   */
  init() {
    const {insecure, secure} = this.store.getState().application.serverPorts;
    this.initialized = this.certificateProvider
      .loadSecureServerConfig()
      .then(
        (options) => (this.secureServer = createServer(secure, this, options)),
      )
      .then(() => {
        this.insecureServer = createServer(insecure, this);
        return;
      });

    if (GK.get('comet_enable_flipper_connection')) {
      this.browserServer = createBrowserServer(8333, this);
    }

    reportPlatformFailures(this.initialized, 'initializeServer');

    if (GK.get('flipper_js_client_emulator')) {
      initJsEmulatorIPC(this.store, this.logger, this, this.connections);
    }

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
        this.browserServer && (await this.browserServer).stop(),
      ]);
    }
  }

  onConnectionCreated(
    clientQuery: SecureClientQuery,
    clientConnection: ClientConnection,
  ): Promise<Client> {
    const {app, os, device, device_id, sdk_version, csr, csr_path, medium} =
      clientQuery;
    const transformedMedium = transformCertificateExchangeMediumToType(medium);
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
    this.connectionTracker.logConnectionAttempt(clientQuery);

    if (this.timeHandler) {
      clearTimeout(this.timeHandler);
    }

    const transformedMedium = transformCertificateExchangeMediumToType(
      clientQuery.medium,
    );
    if (transformedMedium === 'WWW') {
      this.store.dispatch({
        type: 'REGISTER_DEVICE',
        payload: new DummyDevice(
          clientQuery.device_id,
          clientQuery.app + ' Server Exchanged',
          clientQuery.os,
        ),
      });
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

    if (clientQuery.os === 'JSWebApp') {
      this.store.dispatch({
        type: 'REGISTER_DEVICE',
        payload: new JSDevice(clientQuery.device_id, clientQuery.app, 1),
      });
    }
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
          this.timeHandler = setTimeout(() => {
            this.emit('client-unresponsive-error', {
              client,
              medium,
              deviceID: response.deviceId,
            });
          }, 30 * 1000);

          this.emit('finish-client-setup', {
            client,
            deviceId: response.deviceId,
          });

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
  ): Promise<Client> {
    invariant(query, 'expected query');

    // try to get id by comparing giving `csr` to file from `csr_path`
    // otherwise, use given device_id
    const {csr_path, csr} = csrQuery;

    // For iOS we do not need to confirm the device id, as it never changes unlike android.
    if (csr_path && csr && query.os != 'iOS') {
      const app_name = await this.certificateProvider.extractAppNameFromCSR(
        csr,
      );
      query.device_id = await this.certificateProvider.getTargetDeviceId(
        query.os,
        app_name,
        csr_path,
        csr,
      );
    }

    query.app = appNameWithUpdateHint(query);

    const id = buildClientId({
      app: query.app,
      os: query.os,
      device: query.device,
      device_id: query.device_id,
    });
    console.debug(`Device connected: ${id}`, 'server');

    const device =
      getDeviceBySerial(this.store.getState(), query.device_id) ??
      (await findDeviceForConnection(this.store, query.app, query.device_id));

    const client = new Client(
      id,
      query,
      connection,
      this.logger,
      this.store,
      undefined,
      device,
    );

    const info = {
      client,
      connection: connection,
    };

    await client.init();

    connection.subscribeToEvents((status: ConnectionStatus) => {
      if (
        status === ConnectionStatus.CLOSED ||
        status === ConnectionStatus.ERROR
      ) {
        this.onConnectionClosed(client.id);
      }
    });

    console.debug(
      `Device client initialized: ${id}. Supported plugins: ${Array.from(
        client.plugins,
      ).join(', ')}`,
      'server',
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
    this.emit('new-client', client);
    this.emit('clients-change');
    client.emit('plugins-change');

    return client;
  }

  attachFakeClient(client: Client) {
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
        console.error('Unable to find device for connection. Error:', error);
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

export default ServerController;
