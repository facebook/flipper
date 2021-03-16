/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginDefinition, FlipperPlugin, FlipperDevicePlugin} from './plugin';
import BaseDevice, {OS} from './devices/BaseDevice';
import {Logger} from './fb-interfaces/Logger';
import {Store} from './reducers/index';
import {setPluginState} from './reducers/pluginStates';
import {Payload, ConnectionStatus} from 'rsocket-types';
import {Flowable, Single} from 'rsocket-flowable';
import {performance} from 'perf_hooks';
import {reportPluginFailures} from './utils/metrics';
import {notNull} from './utils/typeUtils';
import {default as isProduction} from './utils/isProduction';
import {registerPlugins} from './reducers/plugins';
import createTableNativePlugin from './plugins/TableNativePlugin';
import {EventEmitter} from 'events';
import invariant from 'invariant';
import {
  getPluginKey,
  defaultEnabledBackgroundPlugins,
  isSandyPlugin,
} from './utils/pluginUtils';
import {processMessagesLater} from './utils/messageQueue';
import {emitBytesReceived} from './dispatcher/tracking';
import {debounce} from 'lodash';
import {batch} from 'react-redux';
import {
  createState,
  _SandyPluginInstance,
  _getFlipperLibImplementation,
} from 'flipper-plugin';
import {flipperMessagesClientPlugin} from './utils/self-inspection/plugins/FlipperMessagesClientPlugin';
import {freeze} from 'immer';
import GK from './fb-stubs/GK';
import {message} from 'antd';

type Plugins = Array<string>;

export type ClientQuery = {
  app: string;
  os: OS;
  device: string;
  device_id: string;
  sdk_version?: number;
};

export type ClientExport = {
  id: string;
  query: ClientQuery;
};

type ErrorType = {message: string; stacktrace: string; name: string};
type Params = {
  api: string;
  method: string;
  params?: Object;
};
type RequestMetadata = {method: string; id: number; params: Params | undefined};

const handleError = (store: Store, device: BaseDevice, error: ErrorType) => {
  if (isProduction()) {
    return;
  }
  const crashReporterPlugin: typeof FlipperDevicePlugin = store
    .getState()
    .plugins.devicePlugins.get('CrashReporter') as any;
  if (!crashReporterPlugin) {
    return;
  }
  if (!crashReporterPlugin.persistedStateReducer) {
    console.error('CrashReporterPlugin persistedStateReducer broken'); // Make sure we update this code if we ever convert it to Sandy
    return;
  }

  const pluginKey = getPluginKey(null, device, 'CrashReporter');

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

  const newPluginState =
    crashReporterPlugin.persistedStateReducer == null
      ? persistedState
      : crashReporterPlugin.persistedStateReducer(
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

export interface FlipperClientConnection<D, M> {
  connectionStatus(): Flowable<ConnectionStatus>;
  close(): void;
  fireAndForget(payload: Payload<D, M>): void;
  requestResponse(payload: Payload<D, M>): Single<Payload<D, M>>;
}

export default class Client extends EventEmitter {
  connected = createState(false);
  id: string;
  query: ClientQuery;
  sdkVersion: number;
  messageIdCounter: number;
  plugins: Plugins;
  backgroundPlugins: Plugins;
  connection: FlipperClientConnection<any, any> | null | undefined;
  store: Store;
  activePlugins: Set<string>;
  freezeData = GK.get('flipper_frozen_data');

  /**
   * @deprecated
   * use plugin.deviceSync instead
   */
  device: Promise<BaseDevice>;
  deviceSync: BaseDevice;
  logger: Logger;
  broadcastCallbacks: Map<string, Map<string, Set<Function>>>;
  messageBuffer: Record<
    string /*pluginKey*/,
    {
      plugin:
        | typeof FlipperPlugin
        | typeof FlipperDevicePlugin
        | _SandyPluginInstance;
      messages: Params[];
    }
  > = {};
  sandyPluginStates = new Map<string /*pluginID*/, _SandyPluginInstance>();

  requestCallbacks: Map<
    number,
    {
      resolve: (data: any) => void;
      reject: (err: Error) => void;
      metadata: RequestMetadata;
      // eslint-disable-next-line prettier/prettier
    }
  >;

  constructor(
    id: string,
    query: ClientQuery,
    conn: FlipperClientConnection<any, any> | null | undefined,
    logger: Logger,
    store: Store,
    plugins: Plugins | null | undefined,
    device: BaseDevice,
  ) {
    super();
    this.connected.set(true);
    this.plugins = plugins ? plugins : [];
    this.backgroundPlugins = [];
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

    this.device = Promise.resolve(device);
    this.deviceSync = device;

    const client = this;
    if (conn) {
      conn.connectionStatus().subscribe({
        onNext(payload) {
          if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
            client.connected.set(false);
          }
        },
        onSubscribe(subscription) {
          subscription.request(Number.MAX_SAFE_INTEGER);
        },
        onError(payload) {
          console.error('[client] connection status error ', payload);
        },
      });
    }
  }

  supportsPlugin(pluginId: string): boolean {
    return this.plugins.includes(pluginId);
  }

  isBackgroundPlugin(pluginId: string) {
    return this.backgroundPlugins.includes(pluginId);
  }

  isEnabledPlugin(pluginId: string) {
    return this.store
      .getState()
      .connections.enabledPlugins[this.query.app]?.includes(pluginId);
  }

  shouldConnectAsBackgroundPlugin(pluginId: string) {
    return (
      defaultEnabledBackgroundPlugins.includes(pluginId) ||
      this.isEnabledPlugin(pluginId)
    );
  }

  async init() {
    await this.loadPlugins();
    // this starts all sandy enabled plugins
    this.plugins.forEach((pluginId) =>
      this.startPluginIfNeeded(this.getPlugin(pluginId)),
    );
    this.backgroundPlugins = await this.getBackgroundPlugins();
    this.backgroundPlugins.forEach((plugin) => {
      if (this.shouldConnectAsBackgroundPlugin(plugin)) {
        this.initPlugin(plugin);
      }
    });
  }

  initFromImport(initialStates: Record<string, Record<string, any>>): this {
    this.plugins.forEach((pluginId) => {
      const plugin = this.getPlugin(pluginId);
      if (isSandyPlugin(plugin)) {
        // TODO: needs to be wrapped in error tracking T68955280
        this.sandyPluginStates.set(
          plugin.id,
          new _SandyPluginInstance(
            _getFlipperLibImplementation(),
            plugin,
            this,
            getPluginKey(this.id, {serial: this.query.device_id}, plugin.id),
            initialStates[pluginId],
          ),
        );
      }
    });
    return this;
  }

  // get the supported plugins
  async loadPlugins(): Promise<Plugins> {
    const plugins = await this.rawCall<{plugins: Plugins}>(
      'getPlugins',
      false,
    ).then((data) => data.plugins);
    this.plugins = plugins;
    const nativeplugins = plugins
      .map((plugin) => /_nativeplugin_([^_]+)_([^_]+)/.exec(plugin))
      .filter(notNull)
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
    this.store.dispatch(registerPlugins(nativeplugins as any));
    return plugins;
  }

  startPluginIfNeeded(
    plugin: PluginDefinition | undefined,
    isEnabled = plugin ? this.isEnabledPlugin(plugin.id) : false,
  ) {
    // start a plugin on start if it is a SandyPlugin, which is enabled, and doesn't have persisted state yet
    if (
      isSandyPlugin(plugin) &&
      (isEnabled || defaultEnabledBackgroundPlugins.includes(plugin.id)) &&
      !this.sandyPluginStates.has(plugin.id)
    ) {
      // TODO: needs to be wrapped in error tracking T68955280
      this.sandyPluginStates.set(
        plugin.id,
        new _SandyPluginInstance(
          _getFlipperLibImplementation(),
          plugin,
          this,
          getPluginKey(this.id, {serial: this.query.device_id}, plugin.id),
        ),
      );
    }
  }

  stopPluginIfNeeded(pluginId: string, force = false) {
    if (defaultEnabledBackgroundPlugins.includes(pluginId) && !force) {
      return;
    }
    const pluginKey = getPluginKey(
      this.id,
      {serial: this.query.device_id},
      pluginId,
    );
    delete this.messageBuffer[pluginKey];
    const instance = this.sandyPluginStates.get(pluginId);
    if (instance) {
      instance.destroy();
      this.sandyPluginStates.delete(pluginId);
    }
  }

  // connection lost, but Client might live on
  disconnect() {
    this.sandyPluginStates.forEach((instance) => {
      instance.disconnect();
    });
    this.emit('close');
    this.connected.set(false);
    this.connection = undefined;
  }

  // clean up this client
  destroy() {
    this.disconnect();
    this.plugins.forEach((pluginId) => this.stopPluginIfNeeded(pluginId, true));
  }

  // gets a plugin by pluginId
  getPlugin(pluginId: string): PluginDefinition | undefined {
    const plugins = this.store.getState().plugins;
    return (
      plugins.clientPlugins.get(pluginId) || plugins.devicePlugins.get(pluginId)
    );
  }

  // get the supported background plugins
  async getBackgroundPlugins(): Promise<Plugins> {
    if (this.sdkVersion < 4) {
      return [];
    }
    return await this.rawCall<{plugins: Plugins}>(
      'getBackgroundPlugins',
      false,
    ).then((data) => data.plugins);
  }

  // get the plugins, and update the UI
  async refreshPlugins() {
    const oldBackgroundPlugins = this.backgroundPlugins;
    await this.loadPlugins();
    this.plugins.forEach((pluginId) =>
      this.startPluginIfNeeded(this.getPlugin(pluginId)),
    );
    const newBackgroundPlugins = await this.getBackgroundPlugins();
    this.backgroundPlugins = newBackgroundPlugins;
    // diff the background plugin list, disconnect old, connect new ones
    oldBackgroundPlugins.forEach((plugin) => {
      if (
        !newBackgroundPlugins.includes(plugin) &&
        this.store
          .getState()
          .connections.enabledPlugins[this.query.app]?.includes(plugin)
      ) {
        this.deinitPlugin(plugin);
      }
    });
    newBackgroundPlugins.forEach((plugin) => {
      if (
        !oldBackgroundPlugins.includes(plugin) &&
        this.shouldConnectAsBackgroundPlugin(plugin)
      ) {
        this.initPlugin(plugin);
      }
    });
    this.emit('plugins-change');
  }

  /**
   * @deprecated
   * use deviceSync.serial
   */
  async deviceSerial(): Promise<string> {
    return this.deviceSync.serial;
  }

  onMessage(msg: string) {
    if (typeof msg !== 'string') {
      return;
    }

    batch(() => {
      let rawData;
      try {
        rawData = JSON.parse(msg);
        if (this.freezeData) {
          rawData = freeze(rawData, true);
        }
      } catch (err) {
        console.error(`Invalid JSON: ${msg}`, 'clientMessage');
        return;
      }

      const data: {
        id?: number;
        method?: string;
        params?: Params;
        success?: Object;
        error?: ErrorType;
      } = rawData;

      const {id, method} = data;

      if (
        data.params?.api != 'flipper-messages' &&
        flipperMessagesClientPlugin.isConnected()
      ) {
        flipperMessagesClientPlugin.newMessage({
          device: this.deviceSync?.displayTitle(),
          app: this.query.app,
          flipperInternalMethod: method,
          plugin: data.params?.api,
          pluginMethod: data.params?.method,
          payload: data.params?.params,
          direction: 'toFlipper:message',
        });
      }

      if (id == null) {
        const {error} = data;
        if (error != null) {
          console.error(
            `Error received from device ${
              method ? `when calling ${method}` : ''
            }: ${error.message} + \nDevice Stack Trace: ${error.stacktrace}`,
            'deviceError',
          );
          handleError(this.store, this.deviceSync, error);
        } else if (method === 'refreshPlugins') {
          this.refreshPlugins();
        } else if (method === 'execute') {
          invariant(data.params, 'expected params');
          const params: Params = data.params;
          const bytes = msg.length * 2; // string lengths are measured in UTF-16 units (not characters), so 2 bytes per char
          emitBytesReceived(params.api, bytes);

          const persistingPlugin: PluginDefinition | undefined =
            this.store.getState().plugins.clientPlugins.get(params.api) ||
            this.store.getState().plugins.devicePlugins.get(params.api);

          let handled = false; // This is just for analysis
          if (
            persistingPlugin &&
            ((persistingPlugin as any).persistedStateReducer ||
              // only send messages to enabled sandy plugins
              this.sandyPluginStates.has(params.api))
          ) {
            handled = true;
            const pluginKey = getPluginKey(
              this.id,
              {serial: this.query.device_id},
              params.api,
            );
            if (!this.messageBuffer[pluginKey]) {
              this.messageBuffer[pluginKey] = {
                plugin: (this.sandyPluginStates.get(params.api) ??
                  persistingPlugin) as any,
                messages: [params],
              };
            } else {
              this.messageBuffer[pluginKey].messages.push(params);
            }
            this.flushMessageBufferDebounced();
          }
          const apiCallbacks = this.broadcastCallbacks.get(params.api);
          if (apiCallbacks) {
            const methodCallbacks = apiCallbacks.get(params.method);
            if (methodCallbacks) {
              for (const callback of methodCallbacks) {
                handled = true;
                callback(params.params);
              }
            }
          }
          if (!handled && !isProduction()) {
            console.warn(`Unhandled message ${params.api}.${params.method}`);
          }
        }
        return; // method === 'execute'
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
    });
  }

  onResponse(
    data: {
      success?: Object;
      error?: ErrorType;
    },
    resolve: ((a: any) => any) | undefined,
    reject: (error: ErrorType) => any,
  ) {
    if (data.success) {
      resolve && resolve(data.success);
    } else if (data.error) {
      reject(data.error);
      const {error} = data;
      if (error) {
        handleError(this.store, this.deviceSync, error);
      }
    } else {
      // ???
    }
  }

  toJSON(): ClientExport {
    return {id: this.id, query: this.query};
  }

  subscribe(api: string, method: string, callback: (params: Object) => void) {
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

  unsubscribe(api: string, method: string, callback: Function) {
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

  rawCall<T>(method: string, fromPlugin: boolean, params?: Params): Promise<T> {
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

      const plugin = params ? params.api : undefined;

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
      if (!this.connected.get()) {
        message.warn({
          content: 'Not connected',
          key: 'appnotconnectedwarning',
          duration: 0.5,
        });
        reject(new Error('Not connected to client'));
        return;
      }
      if (!fromPlugin || this.isAcceptingMessagesFromPlugin(plugin)) {
        this.connection!.requestResponse({
          data: JSON.stringify(data),
        }).subscribe({
          onComplete: (payload) => {
            if (!fromPlugin || this.isAcceptingMessagesFromPlugin(plugin)) {
              const logEventName = this.getLogEventName(data);
              this.logger.trackTimeSince(mark, logEventName);
              emitBytesReceived(plugin || 'unknown', payload.data.length * 2);
              const response: {
                success?: Object;
                error?: ErrorType;
              } = JSON.parse(payload.data);

              this.onResponse(response, resolve, reject);

              if (flipperMessagesClientPlugin.isConnected()) {
                flipperMessagesClientPlugin.newMessage({
                  device: this.deviceSync?.displayTitle(),
                  app: this.query.app,
                  flipperInternalMethod: method,
                  payload: response,
                  plugin,
                  pluginMethod: params?.method,
                  direction: 'toFlipper:response',
                });
              }
            }
          },
          onError: (e) => {
            reject(e);
          },
        });
      } else {
        reject(
          new Error(
            `Cannot send ${method}, client is not accepting messages for plugin ${plugin}`,
          ),
        );
      }

      if (flipperMessagesClientPlugin.isConnected()) {
        flipperMessagesClientPlugin.newMessage({
          device: this.deviceSync?.displayTitle(),
          app: this.query.app,
          flipperInternalMethod: method,
          plugin: params?.api,
          pluginMethod: params?.method,
          payload: params?.params,
          direction: 'toClient:call',
        });
      }
    });
  }

  flushMessageBuffer = () => {
    // batch to make sure that Redux collapsed the dispatches
    batch(() => {
      for (const pluginKey in this.messageBuffer) {
        processMessagesLater(
          this.store,
          pluginKey,
          this.messageBuffer[pluginKey].plugin,
          this.messageBuffer[pluginKey].messages,
        );
      }
      this.messageBuffer = {};
    });
  };

  flushMessageBufferDebounced = debounce(this.flushMessageBuffer, 200, {
    leading: true,
    trailing: true,
  });

  startTimingRequestResponse(data: RequestMetadata) {
    performance.mark(this.getPerformanceMark(data));
  }

  finishTimingRequestResponse(data: RequestMetadata) {
    const mark = this.getPerformanceMark(data);
    const logEventName = this.getLogEventName(data);
    this.logger.trackTimeSince(mark, logEventName);
  }

  isAcceptingMessagesFromPlugin(plugin: string | null | undefined) {
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
    this.sandyPluginStates.get(pluginId)?.connect();
  }

  deinitPlugin(pluginId: string) {
    this.activePlugins.delete(pluginId);
    this.sandyPluginStates.get(pluginId)?.disconnect();
    if (this.connected.get()) {
      this.rawSend('deinit', {plugin: pluginId});
    }
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

    if (flipperMessagesClientPlugin.isConnected()) {
      flipperMessagesClientPlugin.newMessage({
        device: this.deviceSync?.displayTitle(),
        app: this.query.app,
        flipperInternalMethod: method,
        payload: params,
        direction: 'toClient:send',
      });
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
        `${api}:${
          method || ''
        } client.send() is deprecated. Please use call() instead so you can handle errors.`,
      );
    }
    return this.rawSend('execute', {api, method, params});
  }

  async supportsMethod(api: string, method: string): Promise<boolean> {
    if (this.sdkVersion < 2) {
      return Promise.resolve(false);
    }
    const response = await this.rawCall<{
      isSupported: boolean;
    }>('isMethodSupported', true, {
      api,
      method,
    });
    return response.isSupported;
  }
}
