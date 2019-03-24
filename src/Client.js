/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {FlipperPlugin, FlipperBasePlugin} from './plugin.js';
import type BaseDevice from './devices/BaseDevice.js';
import type {App} from './App.js';
import type {Logger} from './fb-interfaces/Logger.js';
import type {Store} from './reducers/index.js';
import type {OS} from './devices/BaseDevice.js';
import {FlipperDevicePlugin} from './plugin.js';
import {setPluginState} from './reducers/pluginStates.js';
import {ReactiveSocket, PartialResponder} from 'rsocket-core';
// $FlowFixMe perf_hooks is a new API in node
import {performance} from 'perf_hooks';
import {reportPluginFailures} from './utils/metrics';
import {default as isProduction} from './utils/isProduction.js';
import {registerPlugins} from './reducers/plugins';
import createTableNativePlugin from './plugins/TableNativePlugin';

const EventEmitter = (require('events'): any);
const invariant = require('invariant');

type Plugins = Array<string>;

export type ClientQuery = {|
  app: string,
  os: OS,
  device: string,
  device_id: string,
  sdk_version?: number,
|};

export type ClientExport = {|
  id: string,
  query: ClientQuery,
|};

type ErrorType = {message: string, stacktrace: string, name: string};
type RequestMetadata = {method: string, id: number, params: ?Object};

const handleError = (store: Store, deviceSerial: ?string, error: ErrorType) => {
  if (isProduction()) {
    return;
  }
  const crashReporterPlugin = store
    .getState()
    .plugins.devicePlugins.get('CrashReporter');
  if (!crashReporterPlugin) {
    return;
  }

  const pluginKey = `${deviceSerial || ''}#CrashReporter`;

  const persistedState = {
    ...crashReporterPlugin.defaultPersistedState,
    ...store.getState().pluginStates[pluginKey],
  };
  const isCrashReport: boolean = Boolean(error.name || error.message);
  const payload = isCrashReport
    ? {
        name: error.name,
        reason: error.message,
        callstack: error.stacktrace,
      }
    : {
        name: 'Plugin Error',
        reason: JSON.stringify(error),
      };
  // $FlowFixMe: We checked persistedStateReducer exists
  const newPluginState = crashReporterPlugin.persistedStateReducer(
    persistedState,
    'flipper-crash-report',
    payload,
  );
  if (persistedState !== newPluginState) {
    store.dispatch(
      setPluginState({
        pluginKey,
        state: newPluginState,
      }),
    );
  }
};

export default class Client extends EventEmitter {
  constructor(
    id: string,
    query: ClientQuery,
    conn: ?ReactiveSocket,
    logger: Logger,
    store: Store,
    plugins: ?Plugins,
  ) {
    super();
    this.connected = true;
    this.plugins = plugins ? plugins : [];
    this.connection = conn;
    this.id = id;
    this.query = query;
    this.sdkVersion = query.sdk_version || 0;
    this.messageIdCounter = 0;
    this.logger = logger;
    this.store = store;
    this.broadcastCallbacks = new Map();
    this.requestCallbacks = new Map();
    this.activePlugins = new Set();

    const client = this;
    this.responder = {
      fireAndForget: (payload: {data: string}) => {
        client.onMessage(payload.data);
      },
    };

    if (conn) {
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
  }

  getDevice = (): ?BaseDevice =>
    this.store
      .getState()
      .connections.devices.find(
        (device: BaseDevice) => device.serial === this.query.device_id,
      );

  on: ((event: 'plugins-change', callback: () => void) => void) &
    ((event: 'close', callback: () => void) => void);

  app: App;
  connected: boolean;
  id: string;
  query: ClientQuery;
  sdkVersion: number;
  messageIdCounter: number;
  plugins: Plugins;
  connection: ?ReactiveSocket;
  responder: PartialResponder;
  store: Store;
  activePlugins: Set<string>;

  broadcastCallbacks: Map<?string, Map<string, Set<Function>>>;

  requestCallbacks: Map<
    number,
    {|
      resolve: (data: any) => void,
      reject: (err: Error) => void,
      metadata: RequestMetadata,
    |},
  >;

  supportsPlugin(Plugin: Class<FlipperPlugin<>>): boolean {
    return this.plugins.includes(Plugin.id);
  }

  async init() {
    await this.getPlugins();
  }

  // get the supported plugins
  async getPlugins(): Promise<Plugins> {
    const plugins = await this.rawCall('getPlugins', false).then(
      data => data.plugins,
    );
    this.plugins = plugins;
    const nativeplugins = plugins
      .map(plugin => /_nativeplugin_([^_]+)_([^_]+)/.exec(plugin))
      .filter(Boolean)
      .map(([id, type, title]) => {
        // TODO put this in another component, and make the "types" registerable
        switch (type) {
          case 'Table':
            return createTableNativePlugin(id, title);
          default: {
            return null;
          }
        }
      })
      .filter(Boolean);
    this.store.dispatch(registerPlugins(nativeplugins));
    return plugins;
  }

  // get the plugins, and update the UI
  async refreshPlugins() {
    await this.getPlugins();
    this.emit('plugins-change');
  }

  getDevice = (): ?BaseDevice =>
    this.store
      .getState()
      .connections.devices.find(
        (device: BaseDevice) => device.serial === this.query.device_id,
      );

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

    console.debug(data, 'message:receive');

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
        handleError(this.store, this.getDevice()?.serial, error);
      } else if (method === 'refreshPlugins') {
        this.refreshPlugins();
      } else if (method === 'execute') {
        const params = data.params;
        invariant(params, 'expected params');

        const persistingPlugin: ?Class<FlipperBasePlugin<>> =
          this.store.getState().plugins.clientPlugins.get(params.api) ||
          this.store.getState().plugins.devicePlugins.get(params.api);
        if (persistingPlugin && persistingPlugin.persistedStateReducer) {
          let pluginKey = `${this.id}#${params.api}`;
          //$FlowFixMe
          if (persistingPlugin.prototype instanceof FlipperDevicePlugin) {
            // For device plugins, we are just using the device id instead of client id as the prefix.
            pluginKey = `${this.getDevice()?.serial || ''}#${params.api}`;
          }
          const persistedState = {
            ...persistingPlugin.defaultPersistedState,
            ...this.store.getState().pluginStates[pluginKey],
          };
          // $FlowFixMe: We checked persistedStateReducer exists
          const newPluginState = persistingPlugin.persistedStateReducer(
            persistedState,
            params.method,
            params.params,
          );
          if (persistedState !== newPluginState) {
            this.store.dispatch(
              setPluginState({
                pluginKey,
                state: newPluginState,
              }),
            );
          }
        } else {
          const apiCallbacks = this.broadcastCallbacks.get(params.api);
          if (!apiCallbacks) {
            return;
          }

          const methodCallbacks: ?Set<Function> = apiCallbacks.get(
            params.method,
          );
          if (methodCallbacks) {
            for (const callback of methodCallbacks) {
              callback(params.params);
            }
          }
        }
      }
      return;
    }

    if (this.sdkVersion < 1) {
      const callbacks = this.requestCallbacks.get(id);
      if (!callbacks) {
        return;
      }
      this.requestCallbacks.delete(id);
      this.finishTimingRequestResponse(callbacks.metadata);
      this.onResponse(data, callbacks.resolve, callbacks.reject);
    }
  }

  onResponse(
    data: {
      success?: Object,
      error?: Object,
    },
    resolve: any => any,
    reject: any => any,
  ) {
    if (data.success) {
      resolve(data.success);
    } else if (data.error) {
      reject(data.error);
      const {error} = data;
      if (error) {
        handleError(this.store, this.getDevice()?.serial, error);
      }
    } else {
      // ???
    }
  }

  toJSON(): ClientExport {
    return {id: this.id, query: this.query};
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

  rawCall(
    method: string,
    fromPlugin: boolean,
    params?: Object,
  ): Promise<Object> {
    return new Promise((resolve, reject) => {
      const id = this.messageIdCounter++;
      const metadata: RequestMetadata = {
        method,
        id,
        params,
      };

      if (this.sdkVersion < 1) {
        this.requestCallbacks.set(id, {reject, resolve, metadata});
      }

      const data = {
        id,
        method,
        params,
      };

      const plugin = params?.api;

      console.debug(data, 'message:call');

      if (this.sdkVersion < 1) {
        this.startTimingRequestResponse({method, id, params});
        if (this.connection) {
          this.connection.fireAndForget({data: JSON.stringify(data)});
        }
        return;
      }

      const mark = this.getPerformanceMark(metadata);
      performance.mark(mark);
      if (!fromPlugin || this.isAcceptingMessagesFromPlugin(plugin)) {
        this.connection &&
          this.connection
            .requestResponse({data: JSON.stringify(data)})
            .subscribe({
              onComplete: payload => {
                if (!fromPlugin || this.isAcceptingMessagesFromPlugin(plugin)) {
                  const logEventName = this.getLogEventName(data);
                  this.logger.trackTimeSince(mark, logEventName);
                  const response: {|
                    success?: Object,
                    error?: Object,
                  |} = JSON.parse(payload.data);
                  this.onResponse(response, resolve, reject);
                }
              },
              // Open fresco then layout and you get errors because responses come back after deinit.
              onError: e => {
                if (this.isAcceptingMessagesFromPlugin(plugin)) {
                  reject(e);
                }
              },
            });
      }
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

  isAcceptingMessagesFromPlugin(plugin: ?string) {
    return this.connection && (!plugin || this.activePlugins.has(plugin));
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

  initPlugin(pluginId: string) {
    this.activePlugins.add(pluginId);
    this.rawSend('init', {plugin: pluginId});
  }

  deinitPlugin(pluginId: string) {
    this.activePlugins.delete(pluginId);
    this.rawSend('deinit', {plugin: pluginId});
  }

  rawSend(method: string, params?: Object): void {
    const data = {
      method,
      params,
    };
    console.debug(data, 'message:send');
    if (this.connection) {
      this.connection.fireAndForget({data: JSON.stringify(data)});
    }
  }

  call(
    api: string,
    method: string,
    fromPlugin: boolean,
    params?: Object,
  ): Promise<Object> {
    return reportPluginFailures(
      this.rawCall('execute', fromPlugin, {api, method, params}),
      `Call-${method}`,
      api,
    );
  }

  send(api: string, method: string, params?: Object): void {
    if (!isProduction()) {
      console.warn(
        `${api}:${method ||
          ''} client.send() is deprecated. Please use call() instead so you can handle errors.`,
      );
    }
    return this.rawSend('execute', {api, method, params});
  }

  supportsMethod(api: string, method: string): Promise<boolean> {
    if (this.sdkVersion < 2) {
      return Promise.resolve(false);
    }
    return this.rawCall('isMethodSupported', true, {api, method}).then(
      response => response.isSupported,
    );
  }
}
