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

import BaseDevice from './devices/BaseDevice';
import {Logger, FlipperServer, ServerAddOnControls} from 'flipper-common';
import {
  reportPluginFailures,
  NoLongerConnectedToClientError,
} from 'flipper-common';
import EventEmitter from 'eventemitter3';
import {getPluginKey} from './utils/pluginKey';
import {freeze} from 'immer';
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
} from 'flipper-plugin-core';
import {createServerAddOnControls} from './utils/createServerAddOnControls';
import isProduction from './utils/isProduction';

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

export default abstract class AbstractClient extends EventEmitter {
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

  constructor(
    id: string,
    query: ClientQuery,
    conn: ClientConnection | null | undefined,
    logger: Logger,
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
    this.activePlugins = new Set();
    this.device = device;
    this.flipperServer = flipperServer;
    this.serverAddOnControls = createServerAddOnControls(this.flipperServer);
  }

  isBackgroundPlugin(pluginId: string) {
    return this.backgroundPlugins.has(pluginId);
  }

  protected abstract shouldConnectAsBackgroundPlugin(pluginId: string): boolean;

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

  // get the supported plugins
  protected async loadPlugins(_phase: 'init' | 'refresh'): Promise<Plugins> {
    const {plugins} = await timeout(
      30 * 1000,
      this.rawCall<{plugins: Plugins}>('getPlugins', false),
      'Fetch plugin timeout for ' + this.id,
    );
    this.plugins = new Set(plugins);
    console.info('AbstractClient.loadPlugins', this.query, plugins);
    return plugins;
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

  startPluginIfNeeded(plugin: _SandyPluginDefinition | undefined) {
    if (plugin && !this.sandyPluginStates.has(plugin.id)) {
      this.loadPlugin(plugin);
    }
  }

  stopPluginIfNeeded(pluginId: string, _force = false) {
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

  // gets a plugin definition by pluginId
  protected abstract getPlugin(
    pluginId: string,
  ): Promise<_SandyPluginDefinition | undefined>;

  // get the supported background plugins
  protected async getBackgroundPlugins(): Promise<PluginsArr> {
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
    await this.loadPlugins('refresh');
    await Promise.all(
      [...this.plugins].map(async (pluginId) =>
        this.startPluginIfNeeded(await this.getPlugin(pluginId)),
      ),
    );
    const newBackgroundPlugins = await this.getBackgroundPlugins();
    this.backgroundPlugins = new Set(newBackgroundPlugins);
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
  }

  onMessage(msg: string) {
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

        const handled = this.handleExecuteMessage(params);
        if (!handled && !isProduction()) {
          console.warn(`Unhandled message ${params.api}.${params.method}`);
        }
      }
      // TODO: Warn about unknown method?
      return; // method === 'execute'
    }
  }

  protected handleExecuteMessage(params: Params): boolean {
    const pluginInstance = this.sandyPluginStates.get(params.api);
    if (!pluginInstance) {
      return false;
    }
    pluginInstance.receiveMessages([params]);
    return true;
  }

  protected onResponse(
    data: ClientResponseType,
    resolve: ((a: any) => any) | undefined,
    reject: (error: ClientErrorType) => any,
  ) {
    if (data.success) {
      resolve && resolve(data.success);
    } else if (data.error) {
      reject(data.error);
    }
  }

  protected rawCall<T>(
    method: string,
    fromPlugin: boolean,
    params?: Params,
  ): Promise<T> {
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
        // TODO: display warning in the UI
        reject(new NoLongerConnectedToClientError());
        return;
      }
      if (!fromPlugin || this.isAcceptingMessagesFromPlugin(plugin)) {
        try {
          const response = await this.connection!.sendExpectResponse(data);
          if (!fromPlugin || this.isAcceptingMessagesFromPlugin(plugin)) {
            const logEventName = this.getLogEventName(data);
            this.logger.trackTimeSince(mark, logEventName);
            this.emit(
              'bytes-received',
              plugin || 'unknown',
              response.length * 2,
            );

            this.onResponse(response, resolve, reject);

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
          reject(new Error('Unable to send, connection error: ' + error));
        }
      } else {
        reject(
          new Error(
            `Cannot send ${method}, client is not accepting messages for plugin ${plugin}`,
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
    });
  }

  protected isAcceptingMessagesFromPlugin(plugin: string | null | undefined) {
    return this.connection && (!plugin || this.activePlugins.has(plugin));
  }

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
}
