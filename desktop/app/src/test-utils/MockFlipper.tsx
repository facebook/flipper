/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createStore} from 'redux';
import BaseDevice from '../devices/BaseDevice';
import {rootReducer} from '../store';
import {Store} from '../reducers/index';
import Client, {ClientQuery} from '../Client';
import {buildClientId} from '../utils/clientUtils';
import {Logger} from '../fb-interfaces/Logger';
import {PluginDefinition} from '../plugin';
import {registerPlugins} from '../reducers/plugins';
import {getInstance} from '../fb-stubs/Logger';
import {initializeFlipperLibImplementation} from '../utils/flipperLibImplementation';
import pluginManager from '../dispatcher/pluginManager';
import {PluginDetails} from 'flipper-plugin-lib';

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
}

export default class MockFlipper {
  private unsubscribePluginManager!: () => Promise<void>;
  private _store!: Store;
  private _logger!: Logger;
  private _devices: BaseDevice[] = [];
  private _clients: Client[] = [];
  private _deviceCounter: number = 0;
  private _clientCounter: number = 0;

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
    this._store = createStore(rootReducer);
    this._logger = getInstance();
    this.unsubscribePluginManager = pluginManager(this._store, this._logger, {
      runSideEffectsSynchronously: true,
    });
    initializeFlipperLibImplementation(this._store, this._logger);
    this._store.dispatch(registerPlugins(plugins ?? []));
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
  }: DeviceOptions = {}): BaseDevice {
    const device = new BaseDevice(
      serial ?? `serial_${++this._deviceCounter}`,
      'physical',
      'MockAndroidDevice',
      'Android',
    );
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
      null, // create a stub connection to avoid this plugin to be archived?
      this._logger,
      this._store,
      supportedPlugins,
      device,
    );

    // yikes
    client.device = {
      then() {
        return device;
      },
    } as any;
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
    client.rawSend = jest.fn();

    await client.init();

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
