/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createStore} from 'redux';
import {createRootReducer} from '../../reducers';
import {Store} from '../../reducers/index';
import Client from '../../Client';
import {
  Logger,
  buildClientId,
  FlipperServer,
  ClientResponseType,
} from 'flipper-common';
import {PluginDefinition} from '../../plugin';
import {pluginsInitialized, registerPlugins} from '../../reducers/plugins';
import {getLogger} from 'flipper-common';
import {initializeFlipperLibImplementation} from '../../utils/flipperLibImplementation';
import pluginManager from '../../dispatcher/pluginManager';
import {PluginDetails} from 'flipper-common';
import {ClientQuery, DeviceOS} from 'flipper-common';
import BaseDevice from '../../devices/BaseDevice';
import {TestDevice} from '../../devices/TestDevice';
import ArchivedDevice from '../../devices/ArchivedDevice';
import {ClientConnection} from '../../Client';
import {getFlipperServer} from '../../flipperServer';

export interface AppOptions {
  plugins?: PluginDefinition[];
}

export interface ClientOptions {
  name?: string;
  supportedPlugins?: string[];
  backgroundPlugins?: string[];
  onSend?: (pluginId: string, method: string, params?: object) => any;
  query?: ClientQuery;
  skipRegister?: boolean;
}

export interface DeviceOptions {
  serial?: string;
  isSupportedByPlugin?: (p: PluginDetails) => boolean;
  archived?: boolean;
  os?: DeviceOS;
}

export default class MockFlipper {
  private unsubscribePluginManager!: () => Promise<void>;
  private _store!: Store;
  private _logger!: Logger;
  private _devices: BaseDevice[] = [];
  private _clients: Client[] = [];
  private _deviceCounter: number = 0;
  private _clientCounter: number = 0;
  flipperServer: FlipperServer = getFlipperServer();

  public get store(): Store {
    return this._store;
  }

  public get logger(): Logger {
    return this._logger;
  }

  public get devices(): ReadonlyArray<BaseDevice> {
    return this._devices;
  }

  public get clients(): ReadonlyArray<Client> {
    return this._clients;
  }

  public get dispatch() {
    return this._store.dispatch;
  }

  public getState() {
    return this._store.getState();
  }

  public async init({plugins}: AppOptions = {}) {
    this._store = createStore(createRootReducer());
    this._logger = getLogger();
    this.unsubscribePluginManager = pluginManager(this._store, this._logger, {
      runSideEffectsSynchronously: true,
    });
    initializeFlipperLibImplementation(this._store, this._logger);
    this._store.dispatch(registerPlugins(plugins ?? []));
    this._store.dispatch(pluginsInitialized());
  }

  public async initWithDeviceAndClient(
    {
      appOptions = {},
      deviceOptions = {},
      clientOptions = {},
    }: {
      appOptions?: AppOptions;
      deviceOptions?: DeviceOptions;
      clientOptions?: ClientOptions;
    } = {appOptions: {}, deviceOptions: {}, clientOptions: {}},
  ): Promise<{flipper: MockFlipper; device: BaseDevice; client: Client}> {
    await this.init(appOptions);
    const device = this.createDevice(deviceOptions);
    const client = await this.createClient(device, clientOptions);
    return {
      flipper: this,
      device,
      client,
    };
  }

  public async destroy() {
    this.unsubscribePluginManager && this.unsubscribePluginManager();
  }

  public createDevice({
    serial,
    isSupportedByPlugin,
    archived,
    os,
  }: DeviceOptions = {}): BaseDevice {
    const s = serial ?? `serial_${++this._deviceCounter}`;
    const device = archived
      ? new ArchivedDevice({
          serial: s,
          deviceType: 'emulator',
          title: 'archived device',
          os: 'Android',
        })
      : new TestDevice(s, 'physical', 'MockAndroidDevice', os ?? 'Android');
    device.supportsPlugin = !isSupportedByPlugin
      ? () => true
      : isSupportedByPlugin;
    this.loadDevice(device);
    return device;
  }

  public loadDevice(device: BaseDevice) {
    this._store.dispatch({
      type: 'REGISTER_DEVICE',
      payload: device,
    });
    device.loadDevicePlugins(
      this._store.getState().plugins.devicePlugins,
      this.store.getState().connections.enabledDevicePlugins,
    );
    this._devices.push(device);
    return device;
  }

  public async createClient(
    device: BaseDevice,
    {
      name,
      supportedPlugins,
      backgroundPlugins,
      onSend,
      skipRegister,
      query,
    }: ClientOptions = {},
  ): Promise<Client> {
    if (!this._devices.includes(device)) {
      throw new Error('The provided device does not exist');
    }
    query = query ?? {
      app: name ?? `serial_${++this._clientCounter}`,
      os: 'Android',
      device: device.title,
      device_id: device.serial,
      sdk_version: 4,
      medium: 'NONE',
    };
    const id = buildClientId({
      app: query.app,
      os: query.os,
      device: query.device,
      device_id: query.device_id,
    });
    supportedPlugins =
      supportedPlugins ??
      [...this._store.getState().plugins.clientPlugins.values()].map(
        (p) => p.id,
      );
    const client = new Client(
      id,
      query,
      device.isArchived ? null : createStubConnection(),
      this._logger,
      this._store,
      new Set(supportedPlugins),
      device,
      this.flipperServer,
    );
    client.rawCall = async (
      method: string,
      _fromPlugin: boolean,
      params: any,
    ): Promise<any> => {
      const intercepted = onSend?.(method, params);
      if (intercepted !== undefined) {
        return intercepted;
      }
      switch (method) {
        case 'getPlugins':
          // assuming this plugin supports all plugins for now
          return {
            plugins: supportedPlugins,
          };
        case 'getBackgroundPlugins':
          return {
            plugins: backgroundPlugins ?? [],
          };
        default:
          throw new Error(
            `Test client doesn't support rawCall method '${method}'`,
          );
      }
    };
    (client as any).rawSend = jest.fn();
    if (!device.isArchived) {
      await client.init();
    } else {
      await client.initFromImport({});
    }

    // As convenience, by default we select the new client, star the plugin, and select it
    if (!skipRegister) {
      this._store.dispatch({
        type: 'NEW_CLIENT',
        payload: client,
      });
    }

    this._clients.push(client);

    return client;
  }
}

function createStubConnection(): ClientConnection {
  return {
    send(_: any) {
      throw new Error('Should not be called in test');
    },
    sendExpectResponse(_: any): Promise<ClientResponseType> {
      throw new Error('Should not be called in test');
    },
  };
}
