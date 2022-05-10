/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, Logger} from 'flipper-common';
import {BaseDevice} from 'flipper-frontend-core';
import {_SandyPluginDefinition} from 'flipper-plugin';
import {HeadlessClient} from './HeadlessClient';

type SerializableFnArg =
  | null
  | boolean
  | number
  | string
  | {[prop: string]: SerializableFnArg | SerializableFnArg[]};

interface AvailablePlugin {
  pluginId: string;
  /**
   * `active` if a plugin is connected and running (accepting messages)
   * `ready` if a plugin can be started: bundled or found on a file system.
   * `unavailable` if plugin is supported by a device, but it cannot be loaded by Flipper (not bundled, not found on a file system, does not support a headless mode)
   */
  state: 'unavailable' | 'ready' | 'active';
}

export type FlipperCompanionCommands = {
  'companion-plugin-list': (clientId: string) => Promise<AvailablePlugin[]>;
  /**
   * Start a plugin for a client. It triggers 'onConnect' and 'onActivate' listeners for the plugin.
   */
  'companion-plugin-start': (
    clientId: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Stops and destroys a plugin for a client. It triggers 'onDeactivate', 'onDisconnect', and 'onDestroy' listeners for the plugin.
   */
  'companion-plugin-stop': (
    clientId: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Execute a command exposed via `export const API = () => ...` in a plugin.
   */
  'companion-plugin-exec': (
    clientId: string,
    pluginId: string,
    api: string,
    params?: SerializableFnArg[],
  ) => Promise<any>;
  'companion-device-plugin-list': (
    deviceSerial: string,
  ) => Promise<AvailablePlugin[]>;
  /**
   * Start a device plugin for a device. It triggers 'onActivate' listener for the plugin.
   */
  'companion-device-plugin-start': (
    deviceSerial: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Stops and destroys a device plugin for a device. It triggers 'onDeactivate' and 'onDestroy' listeners for the plugin.
   */
  'companion-device-plugin-stop': (
    deviceSerial: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Execute a command exposed via `export const api = () => ...` in a plugin.
   */
  'companion-device-plugin-exec': (
    deviceSerial: string,
    pluginId: string,
    api: string,
    params?: SerializableFnArg[],
  ) => Promise<any>;
};

export class FlipperServerCompanion {
  /**
   * A map of headless clients. Once a client is started, you can start plugins for the client.
   * Headless client manages a connection from desktop to Flipper server. Device client manages a connection from a device to Flipper server.
   *
   * --- YOUR DESKTOP ---                             --------- Node.js process ----------------------------------                             --- Your iPhone -----
   * | ---------------  |                             | --- Flipper Server Companion ---      ------------------ |                             |                   |
   * | | Flipper CLI |  | <-- WebSocket conection --> | | -------------------          |      |                | |                             | ----------------- |
   * | ---------------  |                             | | | Headless client |          | <--> | Flipper Server | | <-- WebSocker conection --> | | Device client | |
   * --------------------                             | | -------------------          |      |                | |                             | ----------------- |
   *                                                  | --------------------------------      ------------------ |                             |                   |
   *                                                  ------------------------------------------------------------                             --------------------|
   */
  private readonly clients = new Map<string, HeadlessClient>();

  private readonly devices = new Map<string, BaseDevice>();
  private readonly loadablePlugins = new Map<string, _SandyPluginDefinition>();

  constructor(
    private readonly flipperServer: FlipperServer,
    private readonly logger: Logger,
    loadablePluginsArr: ReadonlyArray<_SandyPluginDefinition>,
  ) {
    for (const loadablePlugin of loadablePluginsArr) {
      this.loadablePlugins.set(loadablePlugin.id, loadablePlugin);
    }
  }

  canHandleCommand(command: string): boolean {
    return !!this.commandHandler[command as keyof FlipperCompanionCommands];
  }

  getClient(clientId: string) {
    return this.clients.get(clientId);
  }

  destroyClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(
        'FlipperServerCompanion.destroyClient -> client not found',
      );
    }
    client.destroy();
    this.clients.delete(clientId);
  }

  getDevice(deviceSerial: string) {
    return this.devices.get(deviceSerial);
  }

  destroyDevice(deviceSerial: string) {
    const device = this.devices.get(deviceSerial);
    if (!device) {
      throw new Error(
        'FlipperServerCompanion.destroyDevice -> device not found',
      );
    }
    device.destroy();
    this.devices.delete(deviceSerial);
  }

  destroyAll() {
    this.clients.forEach((client) => client.destroy());
    this.clients.clear();
    this.devices.forEach((device) => device.destroy());
    this.devices.clear();
  }

  private async createHeadlessClientIfNeeded(clientId: string) {
    const existingClient = this.clients.get(clientId);
    if (existingClient) {
      return existingClient;
    }

    const clientInfo = await this.flipperServer.exec('client-find', clientId);
    if (!clientInfo) {
      throw new Error(
        'FlipperServerCompanion.createHeadlessClientIfNeeded -> client not found',
      );
    }

    const device = await this.createHeadlessDeviceIfNeeded(
      clientInfo.query.device_id,
    );

    const newClient = new HeadlessClient(
      clientInfo.id,
      clientInfo.query,
      {
        send: (data: any) => {
          this.flipperServer.exec('client-request', clientInfo.id, data);
        },
        sendExpectResponse: (data: any) =>
          this.flipperServer.exec(
            'client-request-response',
            clientInfo.id,
            data,
          ),
      },
      this.logger,
      undefined,
      device,
      this.flipperServer,
      this.loadablePlugins,
    );

    await newClient.init();

    this.clients.set(clientInfo.id, newClient);
    return newClient;
  }

  private async createHeadlessDeviceIfNeeded(deviceSerial: string) {
    const existingDevice = this.devices.get(deviceSerial);
    if (existingDevice) {
      return existingDevice;
    }

    const deviceInfo = await this.flipperServer.exec(
      'device-find',
      deviceSerial,
    );
    if (!deviceInfo) {
      throw new Error(
        'FlipperServerCompanion.createHeadlessDeviceIfNeeded -> device not found',
      );
    }

    const newDevice = new BaseDevice(this.flipperServer, deviceInfo);
    this.devices.set(newDevice.serial, newDevice);
    return newDevice;
  }

  exec<Event extends keyof FlipperCompanionCommands>(
    event: Event,
    ...args: Parameters<FlipperCompanionCommands[Event]>
  ): ReturnType<FlipperCompanionCommands[Event]>;
  async exec<Event extends keyof FlipperCompanionCommands>(
    event: Event,
    ...args: any[]
  ): Promise<any> {
    try {
      const handler: (...args: any[]) => Promise<any> =
        this.commandHandler[event];
      if (!handler) {
        throw new Error(
          `Unimplemented FlipperServerCompanion command: ${event}`,
        );
      }
      const result = await handler(...args);
      console.debug(`[FlipperServerCompanion] command '${event}' - OK`);
      return result;
    } catch (e) {
      console.debug(
        `[FlipperServerCompanion] command '${event}' - ERROR: ${e} `,
      );
      throw e;
    }
  }

  private commandHandler: FlipperCompanionCommands = {
    'companion-plugin-list': async (clientId) => {
      const client = await this.createHeadlessClientIfNeeded(clientId);
      return [...client.plugins].map((pluginId) => {
        const pluginInstance = client.sandyPluginStates.get(pluginId);

        let state: AvailablePlugin['state'] = 'unavailable';
        if (pluginInstance) {
          state = 'ready';
          if (pluginInstance.activated) {
            state = 'active';
          }
        }
        return {
          pluginId,
          state,
        };
      });
    },
    'companion-plugin-start': async (clientId, pluginId) => {
      const client = await this.createHeadlessClientIfNeeded(clientId);

      const pluginInstance = client.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-start -> plugin not found',
        );
      }

      if (!client.connected.get()) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-start -> client not connected',
        );
      }

      pluginInstance.activate();
    },
    'companion-plugin-stop': async (clientId, pluginId) => {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-stop -> client not found',
        );
      }

      const pluginInstance = client.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-stop -> plugin not found',
        );
      }

      if (!client.connected.get()) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-stop -> client not connected',
        );
      }

      if (!pluginInstance.activated) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-stop -> plugin not activated',
        );
      }

      client.stopPluginIfNeeded(pluginId);
    },
    'companion-plugin-exec': async (clientId, pluginId, api, params) => {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> client not found',
        );
      }

      const pluginInstance = client.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> plugin not found',
        );
      }

      if (!client.connected.get()) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> client not connected',
        );
      }

      if (!pluginInstance.companionApi) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose API',
        );
      }

      if (typeof pluginInstance.companionApi[api] !== 'function') {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose requested API method or it is not callable',
        );
      }

      return pluginInstance.companionApi[api](...(params ?? []));
    },
    'companion-device-plugin-list': async (deviceSerial) => {
      const device = await this.createHeadlessDeviceIfNeeded(deviceSerial);

      const supportedDevicePlugins = [...this.loadablePlugins.values()].filter(
        (plugin) => device.supportsPlugin(plugin),
      );
      return supportedDevicePlugins.map((plugin) => {
        const pluginInstance = device.sandyPluginStates.get(plugin.id);

        let state: AvailablePlugin['state'] = 'ready';
        if (pluginInstance) {
          state = 'active';
        }
        return {
          pluginId: plugin.id,
          state,
        };
      });
    },
    'companion-device-plugin-start': async (deviceSerial, pluginId) => {
      const device = await this.createHeadlessDeviceIfNeeded(deviceSerial);

      const pluginDefinition = this.loadablePlugins.get(pluginId);
      if (!pluginDefinition) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-start -> plugin definition not found',
        );
      }

      if (!device.connected.get()) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-start -> device not connected',
        );
      }

      if (!device.supportsPlugin(pluginDefinition)) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-start -> device does not support plugin',
        );
      }

      device.loadDevicePlugin(pluginDefinition);
      device.sandyPluginStates.get(pluginId)!.activate();
    },
    'companion-device-plugin-stop': async (deviceSerial, pluginId) => {
      const device = this.devices.get(deviceSerial);
      if (!device) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-stop -> client not found',
        );
      }

      const pluginInstance = device.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-stop -> plugin not found',
        );
      }

      if (!device.connected.get()) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-stop -> device not connected',
        );
      }

      if (!pluginInstance.activated) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-stop -> plugin not activated',
        );
      }

      device.unloadDevicePlugin(pluginId);
    },
    'companion-device-plugin-exec': async (
      deviceSerial,
      pluginId,
      api,
      params,
    ) => {
      const device = this.devices.get(deviceSerial);
      if (!device) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-exec -> device not found',
        );
      }

      const pluginInstance = device.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new Error(
          'FlipperServerCompanion.companion-device-plugin-exec -> plugin not found',
        );
      }

      if (!device.connected.get()) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> client not connected',
        );
      }

      if (!pluginInstance.companionApi) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose API',
        );
      }

      if (typeof pluginInstance.companionApi[api] !== 'function') {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose requested API method or it is not callable',
        );
      }

      return pluginInstance.companionApi[api](...(params ?? []));
    },
  };
}
