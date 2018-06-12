/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type BaseDevice from './devices/BaseDevice.js';
import type {App} from './App.js';
import type {SonarPlugin} from './plugin.js';
import plugins from './plugins/index.js';
import CertificateProvider from './utils/CertificateProvider';
import type {SecureServerConfig} from './utils/CertificateProvider';

import {RSocketServer, ReactiveSocket, PartialResponder} from 'rsocket-core';
import RSocketTCPServer from 'rsocket-tcp-server';
const tls = require('tls');
const net = require('net');

const EventEmitter = (require('events'): any);

const invariant = require('invariant');

const SECURE_PORT = 8088;
const INSECURE_PORT = 8089;

type RSocket = {|
  fireAndForget(payload: {data: string}): void,
  connectionStatus(): any,
  close(): void,
|};

type ClientInfo = {|
  connection: ?ReactiveSocket,
  client: Client,
|};

type Plugins = Array<string>;

type ClientQuery = {|
  app: string,
  os: string,
  device: string,
  device_id: ?string,
|};

type RequestMetadata = {method: string, id: number, params: ?Object};

export class Client extends EventEmitter {
  constructor(app: App, id: string, query: ClientQuery, conn: ReactiveSocket) {
    super();

    this.connected = true;
    this.plugins = [];
    this.connection = conn;
    this.id = id;
    this.query = query;
    this.messageIdCounter = 0;
    this.app = app;

    this.broadcastCallbacks = new Map();
    this.requestCallbacks = new Map();

    const client = this;
    this.responder = {
      fireAndForget: (payload: {data: string}) => {
        client.onMessage(payload.data);
      },
    };

    conn.connectionStatus().subscribe({
      onNext(payload) {
        if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
          client.connected = false;
        }
      },
      onSubscribe(subscription) {
        subscription.request(Number.MAX_SAFE_INTEGER);
      },
    });
  }

  on: ((event: 'plugins-change', callback: () => void) => void) &
    ((event: 'close', callback: () => void) => void);

  app: App;
  connected: boolean;
  id: string;
  query: ClientQuery;
  messageIdCounter: number;
  plugins: Plugins;
  connection: ReactiveSocket;
  responder: PartialResponder;

  broadcastCallbacks: Map<?string, Map<string, Set<Function>>>;

  requestCallbacks: Map<
    number,
    {|
      resolve: (data: any) => void,
      reject: (err: Error) => void,
      metadata: RequestMetadata,
    |},
  >;

  getDevice(): ?BaseDevice {
    const {device_id} = this.query;

    if (device_id == null) {
      return null;
    } else {
      return this.app.getDevice(device_id);
    }
  }

  supportsPlugin(Plugin: Class<SonarPlugin<>>): boolean {
    return this.plugins.includes(Plugin.id);
  }

  getFirstSupportedPlugin(): ?string {
    for (const Plugin of plugins) {
      if (this.supportsPlugin(Plugin)) {
        return Plugin.id;
      }
    }
  }

  async init() {
    await this.getPlugins();
  }

  // get the supported plugins
  async getPlugins(): Promise<Plugins> {
    const plugins = await this.rawCall('getPlugins').then(data => data.plugins);
    this.plugins = plugins;
    return plugins;
  }

  // get the plugins, and update the UI
  async refreshPlugins() {
    await this.getPlugins();
    this.emit('plugins-change');
  }

  onMessage(msg: string) {
    if (typeof msg !== 'string') {
      return;
    }

    let rawData;
    try {
      rawData = JSON.parse(msg);
    } catch (err) {
      this.app.logger.error(`Invalid JSON: ${msg}`, 'clientMessage');
      return;
    }

    const data: {|
      id?: number,
      method?: string,
      params?: Object,
      success?: Object,
      error?: Object,
    |} = rawData;

    this.app.logger.info(data, 'message:receive');

    const {id, method} = data;

    if (id == null) {
      const {error} = data;
      if (error != null) {
        this.app.logger.error(error.stacktrace || error.message, 'deviceError');
        this.app.errorReporter.report({
          message: error.message,
          stack: error.stacktrace,
        });
      } else if (method === 'refreshPlugins') {
        this.refreshPlugins();
      } else if (method === 'execute') {
        const params = data.params;
        invariant(params, 'expected params');

        const apiCallbacks = this.broadcastCallbacks.get(params.api);
        if (!apiCallbacks) {
          return;
        }

        const methodCallbacks: ?Set<Function> = apiCallbacks.get(params.method);
        if (methodCallbacks) {
          for (const callback of methodCallbacks) {
            callback(params.params);
          }
        }
      }
      return;
    }

    const callbacks = this.requestCallbacks.get(id);
    if (!callbacks) {
      return;
    }
    this.requestCallbacks.delete(id);
    this.finishTimingRequestResponse(callbacks.metadata);

    if (data.success) {
      callbacks.resolve(data.success);
    } else if (data.error) {
      callbacks.reject(data.error);
    } else {
      // ???
    }
  }

  toJSON() {
    return null;
  }

  subscribe(
    api: ?string = null,
    method: string,
    callback: (params: Object) => void,
  ) {
    let apiCallbacks = this.broadcastCallbacks.get(api);
    if (!apiCallbacks) {
      apiCallbacks = new Map();
      this.broadcastCallbacks.set(api, apiCallbacks);
    }

    let methodCallbacks = apiCallbacks.get(method);
    if (!methodCallbacks) {
      methodCallbacks = new Set();
      apiCallbacks.set(method, methodCallbacks);
    }
    methodCallbacks.add(callback);
  }

  unsubscribe(api: ?string = null, method: string, callback: Function) {
    const apiCallbacks = this.broadcastCallbacks.get(api);
    if (!apiCallbacks) {
      return;
    }

    const methodCallbacks = apiCallbacks.get(method);
    if (!methodCallbacks) {
      return;
    }
    methodCallbacks.delete(callback);
  }

  rawCall(method: string, params?: Object): Promise<Object> {
    return new Promise((resolve, reject) => {
      const id = this.messageIdCounter++;
      const metadata: RequestMetadata = {
        method,
        id,
        params,
      };
      this.requestCallbacks.set(id, {reject, resolve, metadata});

      const data = {
        id,
        method,
        params,
      };

      this.app.logger.info(data, 'message:call');
      this.startTimingRequestResponse({method, id, params});
      this.connection.fireAndForget({data: JSON.stringify(data)});
    });
  }

  startTimingRequestResponse(data: RequestMetadata) {
    performance.mark(this.getPerformanceMark(data));
  }

  finishTimingRequestResponse(data: RequestMetadata) {
    const mark = this.getPerformanceMark(data);
    const logEventName = this.getLogEventName(data);
    this.app.logger.trackTimeSince(mark, logEventName);
  }

  getPerformanceMark(data: RequestMetadata): string {
    const {method, id} = data;
    return `request_response_${method}_${id}`;
  }

  getLogEventName(data: RequestMetadata): string {
    const {method, params} = data;
    return params && params.api && params.method
      ? `request_response_${method}_${params.api}_${params.method}`
      : `request_response_${method}`;
  }

  rawSend(method: string, params?: Object): void {
    const data = {
      method,
      params,
    };
    this.app.logger.info(data, 'message:send');
    this.connection.fireAndForget({data: JSON.stringify(data)});
  }

  call(api: string, method: string, params?: Object): Promise<Object> {
    return this.rawCall('execute', {api, method, params});
  }

  send(api: string, method: string, params?: Object): void {
    return this.rawSend('execute', {api, method, params});
  }
}

export class Server extends EventEmitter {
  connections: Map<string, ClientInfo>;
  secureServer: RSocketServer;
  insecureServer: RSocketServer;
  certificateProvider: CertificateProvider;
  app: App;

  constructor(app: App) {
    super();
    this.app = app;
    this.connections = new Map();
    this.certificateProvider = new CertificateProvider(this, app.logger);
    this.init();
  }

  on: ((event: 'new-client', callback: (client: Client) => void) => void) &
    ((event: 'error', callback: (err: Error) => void) => void) &
    ((event: 'clients-change', callback: () => void) => void);

  init() {
    if (process.env.NODE_ENV === 'test') {
      this.app.logger.warn(
        "rsocket server has not been started as we're in test mode",
        'server',
      );
      return;
    }

    this.certificateProvider
      .loadSecureServerConfig()
      .then(
        options => (this.secureServer = this.startServer(SECURE_PORT, options)),
      );
    this.insecureServer = this.startServer(INSECURE_PORT);
  }

  startServer(port: number, sslConfig?: SecureServerConfig) {
    const server = this;
    const serverFactory = onConnect => {
      const transportServer = sslConfig
        ? tls.createServer(sslConfig, socket => {
            onConnect(socket);
          })
        : net.createServer(onConnect);
      transportServer
        .on('error', err => {
          server.emit('error', err);
          server.app.logger.error(
            `Error opening server on port ${port}`,
            'server',
          );
        })
        .on('listening', () => {
          server.app.logger.warn(
            `${
              sslConfig ? 'Secure' : 'Certificate'
            } server started on port ${port}`,
            'server',
          );
        });
      return transportServer;
    };
    const rsServer = new RSocketServer({
      getRequestHandler: sslConfig
        ? this._trustedRequestHandler
        : this._untrustedRequestHandler,
      transport: new RSocketTCPServer({
        port: port,
        serverFactory: serverFactory,
      }),
    });

    rsServer.start();
    return rsServer;
  }

  _trustedRequestHandler = (conn: RSocket, connectRequest: {data: string}) => {
    const server = this;

    const client = this.addConnection(conn, connectRequest.data);

    conn.connectionStatus().subscribe({
      onNext(payload) {
        if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
          server.app.logger.warn(
            `Device disconnected ${client.id}`,
            'connection',
          );
          server.removeConnection(client.id);
        }
      },
      onSubscribe(subscription) {
        subscription.request(Number.MAX_SAFE_INTEGER);
      },
    });

    return client.responder;
  };

  _untrustedRequestHandler = (
    conn: RSocket,
    connectRequest: {data: string},
  ) => {
    const connectionParameters = JSON.parse(connectRequest.data);

    return {
      fireAndForget: (payload: {data: string}) => {
        if (typeof payload.data !== 'string') {
          return;
        }

        let rawData;
        try {
          rawData = JSON.parse(payload.data);
        } catch (err) {
          this.app.logger.error(
            `Invalid JSON: ${payload.data}`,
            'clientMessage',
          );
          return;
        }

        const json: {|
          method: 'signCertificate',
          csr: string,
          destination: string,
        |} = rawData;
        if (json.method === 'signCertificate') {
          this.app.logger.warn('CSR received from device', 'server');
          const {csr, destination} = json;
          this.certificateProvider.processCertificateSigningRequest(
            csr,
            connectionParameters.os,
            destination,
          );
        }
      },
    };
  };

  close() {
    this.secureServer.stop();
    this.insecureServer.stop();
  }

  toJSON() {
    return null;
  }

  addConnection(conn: ReactiveSocket, queryString: string): Client {
    const query = JSON.parse(queryString);
    invariant(query, 'expected query');

    this.app.logger.warn(`Device connected: ${queryString}`, 'connection');

    const id = `${query.app}-${query.os}-${query.device}`;
    const client = new Client(this.app, id, query, conn);

    const info = {
      client,
      connection: conn,
    };

    client.init().then(() => {
      this.app.logger.info(
        `Device client initialised: ${id}. Supported plugins: ${client.plugins.join(
          ', ',
        )}`,
        'connection',
      );

      /* If a device gets disconnected without being cleaned up properly,
       * sonar won't be aware until it attempts to reconnect.
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
    }
  }
}
