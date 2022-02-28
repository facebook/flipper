/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// We're using `deviceSync` here on purpose which is triggering a lot of warnings.
/* eslint-disable node/no-sync */

import {PluginDefinition} from './plugin';
import BaseDevice from './devices/BaseDevice';
import {Logger, FlipperServer, ServerAddOnControls} from 'flipper-common';
import {Store} from './reducers/index';
import {
  reportPluginFailures,
  NoLongerConnectedToClientError,
} from 'flipper-common';
import {default as isProduction} from './utils/isProduction';
import EventEmitter from 'eventemitter3';
import {getPluginKey} from './utils/pluginKey';

import {defaultEnabledBackgroundPlugins} from './utils/pluginUtils';
import {processMessagesLater} from './utils/messageQueue';
import {emitBytesReceived} from './dispatcher/tracking';
import {debounce} from 'lodash';
import {batch} from 'react-redux';
import {
  timeout,
  ClientQuery,
  ClientResponseType,
  ClientErrorType,
} from 'flipper-common';
import {
  createState,
  _SandyPluginInstance,
  getFlipperLib,
  _SandyPluginDefinition,
} from 'flipper-plugin';
import {freeze} from 'immer';
import {message} from 'antd';
import {
  isFlipperMessageDebuggingEnabled,
  registerFlipperDebugMessage,
} from './chrome/FlipperMessages';
import {waitFor} from './utils/waitFor';
import {createServerAddOnControls} from './utils/createServerAddOnControls';

type Plugins = Set<string>;
type PluginsArr = Array<string>;

export type ClientExport = {
  id: string;
  query: ClientQuery;
};

export type Params = {
  api: string;
  method: string;
  params?: Object;
};
export type RequestMetadata = {
  method: string;
  id: number;
  params: Params | undefined;
};

const handleError = (
  store: Store,
  device: BaseDevice,
  error: ClientErrorType,
) => {
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

export interface ClientConnection {
  send(data: any): void;
  sendExpectResponse(data: any): Promise<ClientResponseType>;
}

export default class Client extends EventEmitter {
  connected = createState(false);
  id: string;
  query: ClientQuery;
  sdkVersion: number;
  messageIdCounter: number;
  plugins: Plugins; // TODO: turn into atom, and remove eventEmitter
  backgroundPlugins: Plugins;
  connection: ClientConnection | null | undefined;
  store: Store;
  activePlugins: Set<string>;

  device: BaseDevice;
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
  private readonly serverAddOnControls: ServerAddOnControls;
  private readonly flipperServer: FlipperServer;

  constructor(
    id: string,
    query: ClientQuery,
    conn: ClientConnection | null | undefined,
    logger: Logger,
    store: Store,
    plugins: Plugins | null | undefined,
    device: BaseDevice,
    flipperServer: FlipperServer,
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
    this.activePlugins = new Set();
    this.device = device;
    this.flipperServer = flipperServer;
    this.serverAddOnControls = createServerAddOnControls(this.flipperServer);
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
    // if a client arrives before all plugins are loaded, we'll have to wait
    await waitFor(this.store, (state) => state.plugins.initialized);
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
    this.emit('plugins-change');
  }

  initFromImport(initialStates: Record<string, Record<string, any>>): this {
    this.plugins.forEach((pluginId) => {
      const plugin = this.getPlugin(pluginId);
      if (plugin) {
        this.loadPlugin(plugin, initialStates[pluginId]);
      }
    });
    this.emit('plugins-change');
    return this;
  }

  // get the supported plugins
  async loadPlugins(): Promise<Plugins> {
    const {plugins} = await timeout(
      30 * 1000,
      this.rawCall<{plugins: Plugins}>('getPlugins', false),
      'Fetch plugin timeout for ' + this.id,
    );
    this.plugins = new Set(plugins);
    return plugins;
  }

  loadPlugin(
    plugin: _SandyPluginDefinition,
    initialState?: Record<string, any>,
  ) {
    try {
      this.sandyPluginStates.set(
        plugin.id,
        new _SandyPluginInstance(
          this.serverAddOnControls,
          getFlipperLib(),
          plugin,
          this,
          getPluginKey(this.id, {serial: this.query.device_id}, plugin.id),
          initialState,
        ),
      );
    } catch (e) {
      console.error(`Failed to start plugin '${plugin.id}': `, e);
    }
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
      this.loadPlugin(plugin);
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
  }

  // clean up this client
  destroy() {
    this.disconnect();
    this.plugins.forEach((pluginId) => this.stopPluginIfNeeded(pluginId, true));
    this.serverAddOnControls.unsubscribe();
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
    const data = await timeout(
      30 * 1000,
      this.rawCall<{plugins: PluginsArr}>('getBackgroundPlugins', false),
      'Fetch background plugins timeout for ' + this.id,
    );
    return data.plugins;
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

  onMessage(msg: string) {
    if (typeof msg !== 'string') {
      return;
    }

    batch(() => {
      let rawData;
      try {
        rawData = freeze(JSON.parse(msg), true);
      } catch (err) {
        console.error(`Invalid JSON: ${msg}`, 'clientMessage');
        return;
      }

      const data: {
        id?: number;
        method?: string;
        params?: Params;
        success?: Object;
        error?: ClientErrorType;
      } = rawData;

      const {id, method} = data;

      if (isFlipperMessageDebuggingEnabled()) {
        registerFlipperDebugMessage({
          device: this.device?.displayTitle(),
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
          handleError(this.store, this.device, error);
        } else if (method === 'refreshPlugins') {
          this.refreshPlugins();
        } else if (method === 'execute') {
          if (!data.params) {
            throw new Error('expected params');
          }
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
    });
  }

  onResponse(
    data: ClientResponseType,
    resolve: ((a: any) => any) | undefined,
    reject: (error: ClientErrorType) => any,
  ) {
    if (data.success) {
      resolve && resolve(data.success);
    } else if (data.error) {
      reject(data.error);
      const {error} = data;
      if (error) {
        handleError(this.store, this.device, error);
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

      const data = {
        id,
        method,
        params,
      };

      const plugin = params ? params.api : undefined;

      console.debug(data, 'message:call');

      const mark = this.getPerformanceMark(metadata);
      performance.mark(mark);
      if (!this.connected.get()) {
        message.warn({
          content: 'Not connected',
          key: 'appnotconnectedwarning',
          duration: 0.5,
        });
        reject(new NoLongerConnectedToClientError());
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
                device: this.device?.displayTitle(),
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
          device: this.device?.displayTitle(),
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
        device: this.device?.displayTitle(),
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
      }).catch((err: Error) => {
        // We only throw errors if the connection is still alive
        // as connection-related ones aren't recoverable from
        // user code.
        if (this.connected.get()) {
          // This is a special case where we a send failed because of
          // a disconnect "mid-air". This can happen, for instance,
          // when you pull the plug from a connected phone. We can
          // still handle this gracefully.
          if (err.toString().includes('Socket closed unexpectedly')) {
            console.warn(
              `Failed to call device due to unexpected disconnect: ${err}`,
            );
            this.disconnect();
            return {};
          }
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
    const response = await this.rawCall<{
      isSupported: boolean;
    }>('isMethodSupported', true, {
      api,
      method,
    });
    return response.isSupported;
  }
}
