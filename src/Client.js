/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {SonarPlugin} from './plugin.js';
import type {App} from './App.js';
import type Logger from './fb-stubs/Logger.js';

import plugins from './plugins/index.js';
import {ReactiveSocket, PartialResponder} from 'rsocket-core';

const EventEmitter = (require('events'): any);
const invariant = require('invariant');

type Plugins = Array<string>;

export type ClientQuery = {|
  app: string,
  os: string,
  device: string,
  device_id: ?string,
|};

type RequestMetadata = {method: string, id: number, params: ?Object};

export default class Client extends EventEmitter {
  constructor(
    id: string,
    query: ClientQuery,
    conn: ReactiveSocket,
    logger: Logger,
  ) {
    super();

    this.connected = true;
    this.plugins = [];
    this.connection = conn;
    this.id = id;
    this.query = query;
    this.messageIdCounter = 0;
    this.logger = logger;

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
      console.error(`Invalid JSON: ${msg}`, 'clientMessage');
      return;
    }

    const data: {|
      id?: number,
      method?: string,
      params?: Object,
      success?: Object,
      error?: Object,
    |} = rawData;

    console.log(data, 'message:receive');

    const {id, method} = data;

    if (id == null) {
      const {error} = data;
      if (error != null) {
        console.error(
          `Error received from device ${
            method ? `when calling ${method}` : ''
          }: ${error.message} + \nDevice Stack Trace: ${error.stacktrace}`,
          'deviceError',
        );
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
    return `<Client#${this.id}>`;
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

      console.log(data, 'message:call');
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
    this.logger.trackTimeSince(mark, logEventName);
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
    console.log(data, 'message:send');
    this.connection.fireAndForget({data: JSON.stringify(data)});
  }

  call(api: string, method: string, params?: Object): Promise<Object> {
    return this.rawCall('execute', {api, method, params});
  }

  send(api: string, method: string, params?: Object): void {
    return this.rawSend('execute', {api, method, params});
  }
}
