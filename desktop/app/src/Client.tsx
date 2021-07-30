/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginDefinition} from './plugin';
import BaseDevice, {OS} from './devices/BaseDevice';
import {Logger} from './fb-interfaces/Logger';
import {Store} from './reducers/index';
import {performance} from 'perf_hooks';
import {reportPluginFailures} from './utils/metrics';
import {default as isProduction} from './utils/isProduction';
import {EventEmitter} from 'events';
import invariant from 'invariant';
import {
  getPluginKey,
  defaultEnabledBackgroundPlugins,
} from './utils/pluginUtils';
import {processMessagesLater} from './utils/messageQueue';
import {emitBytesReceived} from './dispatcher/tracking';
import {debounce} from 'lodash';
import {batch} from 'react-redux';
import {createState, _SandyPluginInstance, getFlipperLib} from 'flipper-plugin';
import {freeze} from 'immer';
import GK from './fb-stubs/GK';
import {message} from 'antd';
import {
  isFlipperMessageDebuggingEnabled,
  registerFlipperDebugMessage,
} from './chrome/FlipperMessages';
import {
  ConnectionStatus,
  ErrorType,
  ClientConnection,
} from './comms/ClientConnection';

type Plugins = Set<string>;
type PluginsArr = Array<string>;

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

type Params = {
  api: string;
  method: string;
  params?: Object;
};
type RequestMetadata = {method: string; id: number; params: Params | undefined};

const handleError = (store: Store, device: BaseDevice, error: ErrorType) => {
  if (store.getState().settingsState.suppressPluginErrors) {
    return;
  }
  const crashReporterPlugin = device.sandyPluginStates.get('CrashReporter');
  if (!crashReporterPlugin) {
    return;
  }
  if (!crashReporterPlugin.instanceApi.reportCrash) {
    console.error('CrashReporterPlugin persistedStateReducer broken');
    return;
  }
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
  crashReporterPlugin.instanceApi.reportCrash(payload);
};

export default class Client extends EventEmitter {
  connected = createState(false);
  id: string;
  query: ClientQuery;
  sdkVersion: number;
  messageIdCounter: number;
  plugins: Plugins;
  backgroundPlugins: Plugins;
  connection: ClientConnection | null | undefined;
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
      plugin: _SandyPluginInstance;
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
    conn: ClientConnection | null | undefined,
    logger: Logger,
    store: Store,
    plugins: Plugins | null | undefined,
    device: BaseDevice,
  ) {
    super();
    this.connected.set(!!conn);
    this.plugins = plugins ? plugins : new Set();
    this.backgroundPlugins = new Set();
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
      conn.subscribeToEvents((status) => {
        if (
          status === ConnectionStatus.CLOSED ||
          status === ConnectionStatus.ERROR
        ) {
          client.connected.set(false);
        }
      });
    }
  }

  supportsPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  isBackgroundPlugin(pluginId: string) {
    return this.backgroundPlugins.has(pluginId);
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
    this.backgroundPlugins = new Set(await this.getBackgroundPlugins());
    this.backgroundPlugins.forEach((plugin) => {
      if (this.shouldConnectAsBackgroundPlugin(plugin)) {
        this.initPlugin(plugin);
      }
    });
  }

  initFromImport(initialStates: Record<string, Record<string, any>>): this {
    this.plugins.forEach((pluginId) => {
      const plugin = this.getPlugin(pluginId);
      if (plugin) {
        // TODO: needs to be wrapped in error tracking T68955280
        this.sandyPluginStates.set(
          plugin.id,
          new _SandyPluginInstance(
            getFlipperLib(),
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
    const {plugins} = await this.rawCall<{plugins: Plugins}>(
      'getPlugins',
      false,
    );
    this.plugins = new Set(plugins);
    return plugins;
  }

  startPluginIfNeeded(
    plugin: PluginDefinition | undefined,
    isEnabled = plugin ? this.isEnabledPlugin(plugin.id) : false,
  ) {
    // start a plugin on start if it is a SandyPlugin, which is enabled, and doesn't have persisted state yet
    if (
      plugin &&
      (isEnabled || defaultEnabledBackgroundPlugins.includes(plugin.id)) &&
      !this.sandyPluginStates.has(plugin.id)
    ) {
      // TODO: needs to be wrapped in error tracking T68955280
      this.sandyPluginStates.set(
        plugin.id,
        new _SandyPluginInstance(
          getFlipperLib(),
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
  async getBackgroundPlugins(): Promise<PluginsArr> {
    if (this.sdkVersion < 4) {
      return [];
    }
    return this.rawCall<{plugins: PluginsArr}>(
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
    this.backgroundPlugins = new Set(newBackgroundPlugins);
    // diff the background plugin list, disconnect old, connect new ones
    oldBackgroundPlugins.forEach((plugin) => {
      if (
        !this.backgroundPlugins.has(plugin) &&
        this.store
          .getState()
          .connections.enabledPlugins[this.query.app]?.includes(plugin)
      ) {
        this.deinitPlugin(plugin);
      }
    });
    newBackgroundPlugins.forEach((plugin) => {
      if (
        !oldBackgroundPlugins.has(plugin) &&
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

      if (isFlipperMessageDebuggingEnabled()) {
        registerFlipperDebugMessage({
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
          if (bytes > 5 * 1024 * 1024) {
            console.warn(
              `Plugin '${params.api}' received excessively large message for '${
                params.method
              }': ${Math.round(bytes / 1024)}kB`,
            );
          }

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
    return new Promise(async (resolve, reject) => {
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
          this.connection.send(data);
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
        try {
          const response = await this.connection!.sendExpectResponse(data);
          if (!fromPlugin || this.isAcceptingMessagesFromPlugin(plugin)) {
            const logEventName = this.getLogEventName(data);
            this.logger.trackTimeSince(mark, logEventName);
            emitBytesReceived(plugin || 'unknown', response.length * 2);

            this.onResponse(response, resolve, reject);

            if (isFlipperMessageDebuggingEnabled()) {
              registerFlipperDebugMessage({
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
        } catch (error) {
          // This is only called if the connection is dead. Not in expected
          // and recoverable cases like a missing receiver/method.
          this.disconnect();
          reject(new Error('Unable to send, connection error: ' + error));
        }
      } else {
        reject(
          new Error(
            `Cannot send ${method}, client is not accepting messages for plugin ${plugin}`,
          ),
        );
      }

      if (isFlipperMessageDebuggingEnabled()) {
        registerFlipperDebugMessage({
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
    if (this.connected.get()) {
      this.rawSend('init', {plugin: pluginId});
      this.sandyPluginStates.get(pluginId)?.connect();
    }
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
      this.connection.send(data);
    }

    if (isFlipperMessageDebuggingEnabled()) {
      registerFlipperDebugMessage({
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
      this.rawCall<Object>('execute', fromPlugin, {
        api,
        method,
        params,
      }).catch((err) => {
        // We only throw errors if the connection is still alive
        // as connection-related ones aren't recoverable from
        // user code.
        if (this.connected.get()) {
          throw err;
        }
        // This effectively preserves the previous behavior
        // of ignoring disconnection-related call failures.
        return {};
      }),
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
