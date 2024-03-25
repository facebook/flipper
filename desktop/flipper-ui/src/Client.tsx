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

import {
  Logger,
  FlipperServer,
  ClientQuery,
  ClientErrorType,
  timeout,
  ClientResponseType,
  reportPluginFailures,
  ServerAddOnControls,
} from 'flipper-common';
import {Store} from './reducers/index';
import {NoLongerConnectedToClientError} from 'flipper-common';
import {defaultEnabledBackgroundPlugins} from './utils/pluginUtils';
import {processMessagesLater} from './utils/messageQueue';
import {emitBytesReceived} from './dispatcher/tracking';
import {debounce} from 'lodash';
import {batch} from 'react-redux';
import {
  _SandyPluginInstance,
  _SandyPluginDefinition,
  createState,
  getFlipperLib,
} from 'flipper-plugin';
import {message} from 'antd';
import {
  isFlipperMessageDebuggingEnabled,
  registerFlipperDebugMessage,
} from './chrome/FlipperMessages';
import {waitFor} from './utils/waitFor';
import BaseDevice from './devices/BaseDevice';
import {getPluginKey} from './utils/pluginKey';
import {EventEmitter} from 'eventemitter3';
import {createServerAddOnControls} from './utils/createServerAddOnControls';
import isProduction from './utils/isProduction';
import {freeze} from 'immer';

type Plugins = Set<string>;
type PluginsArr = Array<string>;

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

export interface ClientConnection {
  send(data: any): void;

  sendExpectResponse(data: any): Promise<ClientResponseType>;
}

export type ClientExport = {
  id: string;
  query: ClientQuery;
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

export default class Client extends EventEmitter {
  connected = createState(false);
  id: string;
  query: ClientQuery;
  sdkVersion: number;
  messageIdCounter: number;
  plugins: Plugins;
  backgroundPlugins: Plugins;
  connection: ClientConnection | null | undefined;
  activePlugins: Set<string>;
  device: BaseDevice;
  logger: Logger;

  sandyPluginStates = new Map<string /*pluginID*/, _SandyPluginInstance>();
  private readonly serverAddOnControls: ServerAddOnControls;
  private readonly flipperServer: FlipperServer;

  private resolveInitPromise!: (_: unknown) => void;
  readonly initializationPromise = new Promise((_resolve) => {
    this.resolveInitPromise = _resolve;
  });
  store: Store;
  broadcastCallbacks: Map<string, Map<string, Set<Function>>>;
  messageBuffer: Record<
    string /*pluginKey*/,
    {
      plugin: _SandyPluginInstance;
      messages: Params[];
    }
  > = {};

  constructor(
    id: string,
    query: ClientQuery,
    conn: ClientConnection | null | undefined,
    logger: Logger,
    store: Store,
    plugins: Set<string> | null | undefined,
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
    this.activePlugins = new Set();
    this.device = device;
    this.flipperServer = flipperServer;
    this.serverAddOnControls = createServerAddOnControls(this.flipperServer);
    this.store = store;
    this.broadcastCallbacks = new Map();

    this.on('flipper-debug-message', (message) => {
      if (isFlipperMessageDebuggingEnabled()) {
        registerFlipperDebugMessage(message);
      }
    });

    this.on('bytes-received', (api, bytes) => emitBytesReceived(api, bytes));

    this.on('error', (error) => handleError(this.store, this.device, error));
  }

  isBackgroundPlugin(pluginId: string) {
    return this.backgroundPlugins.has(pluginId);
  }

  supportsPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
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
    await this.loadPlugins('init');
    await Promise.all(
      [...this.plugins].map(async (pluginId) =>
        this.startPluginIfNeeded(await this.getPlugin(pluginId)),
      ),
    );
    this.backgroundPlugins = new Set(await this.getBackgroundPlugins());
    this.backgroundPlugins.forEach((plugin) => {
      if (this.shouldConnectAsBackgroundPlugin(plugin)) {
        this.initPlugin(plugin);
      }
    });
    this.emit('plugins-change');
    this.resolveInitPromise?.(null);
  }

  async initFromImport(
    initialStates: Record<string, Record<string, any>>,
  ): Promise<this> {
    await Promise.all(
      [...this.plugins].map(async (pluginId) => {
        const plugin = await this.getPlugin(pluginId);
        if (plugin) {
          this.loadPlugin(plugin, initialStates[pluginId]);
        }
      }),
    );
    this.emit('plugins-change');
    return this;
  }

  // get the supported plugins
  async loadPlugins(phase: 'init' | 'refresh'): Promise<Set<string>> {
    let response;
    try {
      response = await timeout(
        30 * 1000,
        this.rawCall<{plugins: Plugins}>('getPlugins', false),
        'Fetch plugin timeout. Unresponsive client?',
      );
    } catch (e) {
      console.warn('Failed to fetch plugin', e);
    }
    this.plugins = new Set(response?.plugins ?? []);
    console.info(
      `Received plugins from '${this.query.app}' on device '${this.query.device}'`,
      [...this.plugins],
    );
    if (phase === 'init') {
      await this.waitForPluginsInit();
    }
    return this.plugins;
  }

  protected async waitForPluginsInit() {
    // if a client arrives before all plugins are loaded, we'll have to wait
    await waitFor(this.store, (state) => state.plugins.initialized);
  }

  startPluginIfNeeded(
    plugin: _SandyPluginDefinition | undefined,
    isEnabled = plugin ? this.isEnabledPlugin(plugin.id) : false,
  ) {
    // start a plugin on start if it is a SandyPlugin, which is enabled, and doesn't have persisted state yet
    if (
      plugin &&
      !this.sandyPluginStates.has(plugin.id) &&
      (isEnabled || defaultEnabledBackgroundPlugins.includes(plugin.id))
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
  protected async getPlugin(
    pluginId: string,
  ): Promise<_SandyPluginDefinition | undefined> {
    const plugins = this.store.getState().plugins;
    return (
      plugins.clientPlugins.get(pluginId) || plugins.devicePlugins.get(pluginId)
    );
  }

  onMessage(msg: string) {
    batch(() => {
      if (typeof msg !== 'string') {
        return;
      }

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

      this.emit('flipper-debug-message', {
        device: this.device?.displayTitle(),
        app: this.query.app,
        flipperInternalMethod: method,
        plugin: data.params?.api,
        pluginMethod: data.params?.method,
        payload: data.params?.params,
        direction: 'toFlipper:message',
      });

      if (id == null) {
        const {error} = data;
        if (error != null) {
          console.error(
            `Error received from device ${
              method ? `when calling ${method}` : ''
            }: ${error.message} + \nDevice Stack Trace: ${error.stacktrace}`,
            'deviceError',
          );
          this.emit('error', error);
        } else if (method === 'refreshPlugins') {
          this.refreshPlugins();
        } else if (method === 'execute') {
          if (!data.params) {
            throw new Error('expected params');
          }
          const params: Params = data.params;
          const bytes = msg.length * 2; // string lengths are measured in UTF-16 units (not characters), so 2 bytes per char
          this.emit('bytes-received', params.api, bytes);
          if (bytes > 5 * 1024 * 1024) {
            console.warn(
              `Plugin '${params.api}' received excessively large message for '${
                params.method
              }': ${Math.round(bytes / 1024)}kB`,
            );
          }

          const persistingPlugin: _SandyPluginDefinition | undefined =
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
        // TODO: Warn about unknown method?
        return; // method === 'execute'
      }
    });
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
    if (!this.connected.get()) {
      return false;
    }
    const response = await this.rawCall<{
      isSupported: boolean;
    }>('isMethodSupported', true, {
      api,
      method,
    });
    return response.isSupported;
  }

  async refreshPlugins() {
    try {
      const oldBackgroundPlugins = this.backgroundPlugins;
      await this.loadPlugins('refresh');
      await Promise.all(
        [...this.plugins].map(async (pluginId) =>
          this.startPluginIfNeeded(await this.getPlugin(pluginId)),
        ),
      );
      let newBackgroundPlugins: PluginsArr = [];
      try {
        newBackgroundPlugins = await this.getBackgroundPlugins();
        this.backgroundPlugins = new Set(newBackgroundPlugins);
      } catch (e: unknown) {
        if ((e as Error).message.includes('timeout')) {
          console.warn(e);
        } else {
          throw e;
        }
      }
      // diff the background plugin list, disconnect old, connect new ones
      oldBackgroundPlugins.forEach((plugin) => {
        if (!this.backgroundPlugins.has(plugin)) {
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
    } catch (e) {
      if (this.connected) {
        throw e;
      } else {
        console.warn(e);
      }
    }
  }

  protected loadPlugin(
    plugin: _SandyPluginDefinition,
    initialState?: Record<string, any>,
  ) {
    try {
      const pluginInstance = new _SandyPluginInstance(
        this.serverAddOnControls,
        getFlipperLib(),
        plugin,
        this,
        getPluginKey(this.id, {serial: this.query.device_id}, plugin.id),
        initialState,
      );
      pluginInstance.events.on('error', (message) => {
        const error: ClientErrorType = {
          message,
          name: 'Plugin Error',
          stacktrace: '',
        };
        this.emit('error', error);
      });
      this.sandyPluginStates.set(plugin.id, pluginInstance);
    } catch (e) {
      console.error(`Failed to start plugin '${plugin.id}': `, e);
    }
  }

  protected async getBackgroundPlugins(): Promise<PluginsArr> {
    if (this.sdkVersion < 4) {
      return [];
    }
    const data = await timeout(
      30 * 1000,
      this.rawCall<{plugins: PluginsArr}>('getBackgroundPlugins', false),
      `Fetch background plugins timeout for ${this.id}`,
    );
    return data.plugins;
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
    return new Promise<T>(async (resolve, reject) => {
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

      const baseErrorMessage = `Unable to send ${params?.method ?? method} to ${
        params?.api ?? 'FlipperCore'
      }`;
      console.debug(data, 'message:call');

      const mark = this.getPerformanceMark(metadata);
      performance.mark(mark);
      if (!this.connected.get()) {
        // TODO: display warning in the UI
        reject(new NoLongerConnectedToClientError());
        return;
      }

      const acceptingMessagesFromPlugin =
        this.connection && (!plugin || this.activePlugins.has(plugin));

      if (!fromPlugin || acceptingMessagesFromPlugin) {
        try {
          // TODO: Fix this the next time the file is edited.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const response = await this.connection!.sendExpectResponse(data);
          if (!fromPlugin || acceptingMessagesFromPlugin) {
            const logEventName = this.getLogEventName(data);
            this.logger.trackTimeSince(mark, logEventName);
            this.emit(
              'bytes-received',
              plugin || 'unknown',
              response.length * 2,
            );

            if (response.success) {
              resolve && resolve(response.success as T);
            } else if (response.error) {
              reject(response.error);
            }

            this.emit('flipper-debug-message', {
              device: this.device?.displayTitle(),
              app: this.query.app,
              flipperInternalMethod: method,
              payload: response,
              plugin,
              pluginMethod: params?.method,
              direction: 'toFlipper:response',
            });
          }
        } catch (error) {
          reject(new Error(`${baseErrorMessage}, connection error: ${error}`));
        }
      } else {
        reject(
          new Error(
            `${baseErrorMessage}, client is not accepting messages for plugin ${plugin}`,
          ),
        );
      }

      this.emit('flipper-debug-message', {
        device: this.device?.displayTitle(),
        app: this.query.app,
        flipperInternalMethod: method,
        plugin: params?.api,
        pluginMethod: params?.method,
        payload: params?.params,
        direction: 'toClient:call',
      });
    }).catch((error) => {
      if (error instanceof NoLongerConnectedToClientError) {
        message.warn({
          content: 'Not connected',
          key: 'appnotconnectedwarning',
          duration: 0.5,
        });
      }
      throw error;
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

  protected getPerformanceMark(data: RequestMetadata): string {
    const {method, id} = data;
    return `request_response_${method}_${id}`;
  }

  protected getLogEventName(data: RequestMetadata): string {
    const {method, params} = data;
    return params && params.api && params.method
      ? `request_response_${method}_${params.api}_${params.method}`
      : `request_response_${method}`;
  }

  initPlugin(pluginId: string) {
    this.activePlugins.add(pluginId);
    const instance = this.sandyPluginStates.get(pluginId);
    if (this.connected.get() && instance) {
      this.rawSend('init', {plugin: pluginId});
      instance.connect();
    }
  }

  deinitPlugin(pluginId: string) {
    this.activePlugins.delete(pluginId);
    const instance = this.sandyPluginStates.get(pluginId);
    instance?.disconnect();
    if (this.connected.get() && instance) {
      this.rawSend('deinit', {plugin: pluginId});
    }
  }

  flushMessageBufferDebounced = debounce(this.flushMessageBuffer, 200, {
    leading: true,
    trailing: true,
  });

  protected rawSend(method: string, params?: Object): void {
    const data = {
      method,
      params,
    };
    console.debug(data, 'message:send');
    if (this.connection) {
      this.connection.send(data);
    }

    this.emit('flipper-debug-message', {
      device: this.device?.displayTitle(),
      app: this.query.app,
      flipperInternalMethod: method,
      payload: params,
      direction: 'toClient:send',
    });
  }
}
