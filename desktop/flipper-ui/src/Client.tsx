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
} from 'flipper-common';
import {Store} from './reducers/index';
import {NoLongerConnectedToClientError} from 'flipper-common';
import {defaultEnabledBackgroundPlugins} from './utils/pluginUtils';
import {processMessagesLater} from './utils/messageQueue';
import {emitBytesReceived} from './dispatcher/tracking';
import {debounce} from 'lodash';
import {batch} from 'react-redux';
import {_SandyPluginInstance, _SandyPluginDefinition} from 'flipper-plugin';
import {message} from 'antd';
import {
  isFlipperMessageDebuggingEnabled,
  registerFlipperDebugMessage,
} from './chrome/FlipperMessages';
import {waitFor} from './utils/waitFor';
import BaseDevice from './devices/BaseDevice';
import AbstractClient, {
  ClientConnection,
  Params,
  RequestMetadata,
} from './AbstractClient';
import {getPluginKey} from './utils/pluginKey';
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

export default class Client extends AbstractClient {
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
    super(id, query, conn, logger, plugins, device, flipperServer);
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
    const plugins = await super.loadPlugins(phase);
    if (phase === 'init') {
      // if a client arrives before all plugins are loaded, we'll have to wait
      await waitFor(this.store, (state) => state.plugins.initialized);
    }
    return plugins;
  }

  startPluginIfNeeded(
    plugin: _SandyPluginDefinition | undefined,
    isEnabled = plugin ? this.isEnabledPlugin(plugin.id) : false,
  ) {
    // start a plugin on start if it is a SandyPlugin, which is enabled, and doesn't have persisted state yet
    if (
      plugin &&
      (isEnabled || defaultEnabledBackgroundPlugins.includes(plugin.id))
    ) {
      super.startPluginIfNeeded(plugin);
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
    return super.stopPluginIfNeeded(pluginId, force);
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
      super.onMessage(msg);
    });
  }

  protected handleExecuteMessage(params: Params): boolean {
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
    return handled;
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
    return super.rawCall<T>(method, fromPlugin, params).catch((error) => {
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
}
