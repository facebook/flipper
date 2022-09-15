/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'events';
import {
  FlipperServer,
  Logger,
  UserError,
  SystemError,
  FlipperCompanionCommands,
  FlipperCompanionEvents,
  FlipperCompanionAvailablePlugin,
} from 'flipper-common';
import {BaseDevice} from 'flipper-frontend-core';
import {_SandyPluginDefinition} from 'flipper-plugin-core';
import {isAtom} from 'flipper-plugin-core';
import {HeadlessClient} from './HeadlessClient';
import {FlipperServerCompanionEnv} from './init';

const companionEvents: Array<keyof FlipperCompanionEvents> = [
  'companion-plugin-state-update',
  'companion-device-plugin-state-update',
];

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
  private readonly eventBus = new EventEmitter();

  constructor(
    private readonly flipperServer: FlipperServer,
    private readonly logger: Logger,
    private readonly env: FlipperServerCompanionEnv,
  ) {
    const loadablePluginsArr = env.pluginInitializer.initialPlugins;
    for (const loadablePlugin of loadablePluginsArr) {
      this.loadablePlugins.set(loadablePlugin.id, loadablePlugin);
    }
    console.debug(`[FlipperServerCompanion] constructor -> loadable plugins`, [
      ...this.loadablePlugins.keys(),
    ]);
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
      throw new UserError(
        'FlipperServerCompanion.destroyClient -> client not found',
        client,
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
      throw new UserError(
        'FlipperServerCompanion.destroyDevice -> device not found',
        deviceSerial,
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
      throw new UserError(
        'FlipperServerCompanion.createHeadlessClientIfNeeded -> client not found',
        clientId,
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
    console.debug(
      `[FlipperServerCompanion] createHeadlessClientIfNeeded -> new client created with plugins`,
      [...newClient.sandyPluginStates.keys()],
    );

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
      throw new UserError(
        'FlipperServerCompanion.createHeadlessDeviceIfNeeded -> device not found',
        deviceSerial,
      );
    }

    const newDevice = new BaseDevice(this.flipperServer, deviceInfo);
    console.debug(
      `[FlipperServerCompanion] createHeadlessClientIfNeeded -> new device created with plugins`,
      [...this.loadablePlugins.keys()],
    );
    this.devices.set(newDevice.serial, newDevice);
    return newDevice;
  }

  private async loadPluginIfNeeded(pluginId: string) {
    if (!this.loadablePlugins.has(pluginId)) {
      console.info(
        'FlipperServerCompanion.loadPluginIfNeeded -> plugin not found, attempt to install from marketplace',
      );

      const plugin = await this.flipperServer.exec(
        'plugins-install-from-marketplace',
        pluginId,
      );
      if (plugin) {
        const sandyPlugin = await this.env.pluginInitializer.installPlugin(
          plugin,
        );
        if (sandyPlugin) {
          console.info(
            'FlipperServerCompanion.loadPluginIfNeeded -> plugin successfully installed',
          );
          this.loadablePlugins.set(pluginId, sandyPlugin);
        }
      }
    }
  }

  private emit<T extends keyof FlipperCompanionEvents>(
    event: T,
    data: FlipperCompanionEvents[T],
  ) {
    this.eventBus.emit(event, data);
  }

  onAny(
    cb: <T extends keyof FlipperCompanionEvents>(
      event: T,
      data: FlipperCompanionEvents[T],
    ) => void,
  ) {
    for (const eventName of companionEvents) {
      this.eventBus.on(eventName, (data) => cb(eventName, data));
    }
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
      console.debug(`[FlipperServerCompanion] command '${event}'`, ...args);
      const handler: (...args: any[]) => Promise<any> =
        this.commandHandler[event];
      if (!handler) {
        throw new UserError(
          `Unimplemented FlipperServerCompanion command`,
          event,
        );
      }
      const result = await handler(...args);
      console.debug(`[FlipperServerCompanion] command '${event}' - OK`, result);
      return result;
    } catch (e) {
      console.debug(`[FlipperServerCompanion] command '${event}' - ERROR`, e);
      throw e;
    }
  }

  private commandHandler: FlipperCompanionCommands = {
    'companion-plugin-list': async (clientId) => {
      const client = await this.createHeadlessClientIfNeeded(clientId);
      return [...client.plugins].map((pluginId) => {
        const pluginInstance = client.sandyPluginStates.get(pluginId);

        let state: FlipperCompanionAvailablePlugin['state'] = 'unavailable';
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
      await this.loadPluginIfNeeded(pluginId);

      const client = await this.createHeadlessClientIfNeeded(clientId);

      const pluginInstance = client.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-start -> plugin not found',
          clientId,
          pluginId,
        );
      }

      if (!client.connected.get()) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-start -> client not connected',
          clientId,
          pluginId,
        );
      }

      pluginInstance.activate();
    },
    'companion-plugin-stop': async (clientId, pluginId) => {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-stop -> client not found',
          clientId,
          pluginId,
        );
      }

      const pluginInstance = client.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-stop -> plugin not found',
          clientId,
          pluginId,
        );
      }

      if (!client.connected.get()) {
        throw new Error(
          'FlipperServerCompanion.companion-plugin-stop -> client not connected',
        );
      }

      if (!pluginInstance.activated) {
        throw new SystemError(
          'FlipperServerCompanion.companion-plugin-stop -> plugin not activated',
          clientId,
          pluginId,
        );
      }

      client.stopPluginIfNeeded(pluginId);
    },
    'companion-plugin-exec': async (clientId, pluginId, api, params) => {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-exec -> client not found',
          clientId,
          pluginId,
          api,
          params,
        );
      }

      const pluginInstance = client.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-exec -> plugin not found',
          clientId,
          pluginId,
          api,
          params,
        );
      }

      if (!client.connected.get()) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-exec -> client not connected',
          clientId,
          pluginId,
          api,
          params,
        );
      }

      if (!pluginInstance.companionApi) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose API',
          clientId,
          pluginId,
          api,
          params,
        );
      }

      if (typeof pluginInstance.companionApi[api] !== 'function') {
        throw new SystemError(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose requested API method or it is not callable',
          clientId,
          pluginId,
          api,
          params,
        );
      }

      return new Promise(async (resolve, reject) => {
        const closeHandle = () => {
          reject(new Error('Client disconnected whilst executing request'));
        };
        client.once('close', closeHandle);

        try {
          const response = await pluginInstance.companionApi[api](
            ...(params ?? []),
          );
          resolve(response);
        } catch (error) {
          reject(error);
        } finally {
          client.off('close', closeHandle);
        }
      });
    },
    'companion-plugin-subscribe': async (clientId, pluginId, api) => {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-subscribe -> client not found',
          clientId,
          pluginId,
          api,
        );
      }

      const pluginInstance = client.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-subscribe -> plugin not found',
          clientId,
          pluginId,
          api,
        );
      }

      if (!client.connected.get()) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-subscribe -> client not connected',
          clientId,
          pluginId,
          api,
        );
      }

      if (!pluginInstance.companionApi) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-subscribe -> plugin does not expose API',
          clientId,
          pluginId,
          api,
        );
      }

      const stateAtom = pluginInstance.companionApi[api];
      if (!isAtom(stateAtom)) {
        throw new SystemError(
          'FlipperServerCompanion.companion-plugin-subscribe -> plugin does not expose requested state or it is not an Atom (created with `createState`)',
          clientId,
          pluginId,
          api,
        );
      }

      stateAtom.subscribe((data) =>
        this.emit('companion-plugin-state-update', {
          clientId,
          pluginId,
          api,
          data,
        }),
      );

      return stateAtom.get();
    },
    'companion-device-plugin-list': async (deviceSerial) => {
      const device = await this.createHeadlessDeviceIfNeeded(deviceSerial);

      const supportedDevicePlugins = [...this.loadablePlugins.values()].filter(
        (plugin) => device.supportsPlugin(plugin),
      );
      return supportedDevicePlugins.map((plugin) => {
        const pluginInstance = device.sandyPluginStates.get(plugin.id);

        let state: FlipperCompanionAvailablePlugin['state'] = 'ready';
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
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-start -> plugin definition not found',
          deviceSerial,
          pluginId,
        );
      }

      if (!device.connected.get()) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-start -> device not connected',
          deviceSerial,
          pluginId,
        );
      }

      if (!device.supportsPlugin(pluginDefinition)) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-start -> device does not support plugin',
          deviceSerial,
          pluginId,
        );
      }

      device.loadDevicePlugin(pluginDefinition);
      device.sandyPluginStates.get(pluginId)!.activate();
    },
    'companion-device-plugin-stop': async (deviceSerial, pluginId) => {
      const device = this.devices.get(deviceSerial);
      if (!device) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-stop -> client not found',
          deviceSerial,
          pluginId,
        );
      }

      const pluginInstance = device.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-stop -> plugin not found',
          deviceSerial,
          pluginId,
        );
      }

      if (!device.connected.get()) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-stop -> device not connected',
          deviceSerial,
          pluginId,
        );
      }

      if (!pluginInstance.activated) {
        throw new SystemError(
          'FlipperServerCompanion.companion-device-plugin-stop -> plugin not activated',
          deviceSerial,
          pluginId,
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
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-exec -> device not found',
          deviceSerial,
          pluginId,
          api,
          params,
        );
      }

      const pluginInstance = device.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-exec -> plugin not found',
          deviceSerial,
          pluginId,
          api,
          params,
        );
      }

      if (!device.connected.get()) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-exec -> client not connected',
          deviceSerial,
          pluginId,
          api,
          params,
        );
      }

      if (!pluginInstance.companionApi) {
        throw new UserError(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose API',
          deviceSerial,
          pluginId,
          api,
          params,
        );
      }

      if (typeof pluginInstance.companionApi[api] !== 'function') {
        throw new SystemError(
          'FlipperServerCompanion.companion-plugin-exec -> plugin does not expose requested API method or it is not callable',
          deviceSerial,
          pluginId,
          api,
          params,
        );
      }

      return pluginInstance.companionApi[api](...(params ?? []));
    },
    'companion-device-plugin-subscribe': async (
      deviceSerial,
      pluginId,
      api,
    ) => {
      const device = this.devices.get(deviceSerial);
      if (!device) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-subscribe -> device not found',
          deviceSerial,
          pluginId,
          api,
        );
      }

      const pluginInstance = device.sandyPluginStates.get(pluginId);
      if (!pluginInstance) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-subscribe -> plugin not found',
          deviceSerial,
          pluginId,
          api,
        );
      }

      if (!device.connected.get()) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-subscribe -> client not connected',
          deviceSerial,
          pluginId,
          api,
        );
      }

      if (!pluginInstance.companionApi) {
        throw new UserError(
          'FlipperServerCompanion.companion-device-plugin-subscribe -> plugin does not expose API',
          deviceSerial,
          pluginId,
          api,
        );
      }

      const stateAtom = pluginInstance.companionApi[api];
      if (!isAtom(stateAtom)) {
        throw new SystemError(
          'FlipperServerCompanion.companion-device-plugin-subscribe -> plugin does not expose requested state or it is not an Atom (created with `createState`)',
          deviceSerial,
          pluginId,
          api,
        );
      }

      stateAtom.subscribe((data) =>
        this.emit('companion-device-plugin-state-update', {
          deviceSerial,
          pluginId,
          api,
          data,
        }),
      );

      return stateAtom.get();
    },
  };
}
