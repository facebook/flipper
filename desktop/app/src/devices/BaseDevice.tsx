/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import stream from 'stream';
import {
  DeviceLogEntry,
  _SandyDevicePluginInstance,
  _SandyPluginDefinition,
  DeviceType,
  DeviceLogListener,
  Idler,
  createState,
  getFlipperLib,
  DeviceOS,
  DeviceDescription,
  FlipperServer,
} from 'flipper-plugin';
import {DeviceSpec, PluginDetails} from 'flipper-plugin-lib';
import {getPluginKey} from '../utils/pluginKey';
import {Base64} from 'js-base64';

export type DeviceShell = {
  stdout: stream.Readable;
  stderr: stream.Readable;
  stdin: stream.Writable;
};

type PluginDefinition = _SandyPluginDefinition;
type PluginMap = Map<string, PluginDefinition>;

export type DeviceExport = {
  os: DeviceOS;
  title: string;
  deviceType: DeviceType;
  serial: string;
  pluginStates: Record<string, any>;
};

export default class BaseDevice {
  description: DeviceDescription;
  flipperServer: FlipperServer;
  isArchived = false;
  hasDevicePlugins = false; // true if there are device plugins for this device (not necessarily enabled)

  constructor(flipperServer: FlipperServer, description: DeviceDescription) {
    this.flipperServer = flipperServer;
    this.description = description;
  }

  // operating system of this device
  get os() {
    return this.description.os;
  }

  // human readable name for this device
  get title(): string {
    return this.description.title;
  }

  // type of this device
  get deviceType() {
    return this.description.deviceType;
  }

  // serial number for this device
  get serial() {
    return this.description.serial;
  }

  // additional device specs used for plugin compatibility checks
  get specs(): DeviceSpec[] {
    return this.description.specs ?? [];
  }

  // possible src of icon to display next to the device title
  get icon() {
    return this.description.icon;
  }

  logListeners: Map<Symbol, DeviceLogListener> = new Map();

  readonly connected = createState(true);

  // if imported, stores the original source location
  source = '';

  // TODO: ideally we don't want BasePlugin to know about the concept of plugins
  sandyPluginStates: Map<string, _SandyDevicePluginInstance> = new Map<
    string,
    _SandyDevicePluginInstance
  >();

  supportsOS(os: DeviceOS) {
    return os.toLowerCase() === this.os.toLowerCase();
  }

  displayTitle(): string {
    return this.connected.get() ? this.title : `${this.title} (Offline)`;
  }

  async exportState(
    idler: Idler,
    onStatusMessage: (msg: string) => void,
    selectedPlugins: string[],
  ): Promise<Record<string, any>> {
    const pluginStates: Record<string, any> = {};

    for (const instance of this.sandyPluginStates.values()) {
      if (
        selectedPlugins.includes(instance.definition.id) &&
        instance.isPersistable()
      ) {
        pluginStates[instance.definition.id] = await instance.exportState(
          idler,
          onStatusMessage,
        );
      }
    }

    return pluginStates;
  }

  toJSON() {
    return {
      os: this.os,
      title: this.title,
      deviceType: this.deviceType,
      serial: this.serial,
    };
  }

  private deviceLogEventHandler = (payload: {
    serial: string;
    entry: DeviceLogEntry;
  }) => {
    if (payload.serial === this.serial && this.logListeners.size > 0) {
      this.addLogEntry(payload.entry);
    }
  };

  addLogEntry(entry: DeviceLogEntry) {
    this.logListeners.forEach((listener) => {
      // prevent breaking other listeners, if one listener doesn't work.
      try {
        listener(entry);
      } catch (e) {
        console.error(`Log listener exception:`, e);
      }
    });
  }

  async startLogging() {
    await this.flipperServer.exec('device-start-logging', this.serial);
    this.flipperServer.on('device-log', this.deviceLogEventHandler);
  }

  stopLogging() {
    this.flipperServer.off('device-log', this.deviceLogEventHandler);
    return this.flipperServer.exec('device-stop-logging', this.serial);
  }

  addLogListener(callback: DeviceLogListener): Symbol {
    if (this.logListeners.size === 0) {
      this.startLogging();
    }
    const id = Symbol();
    this.logListeners.set(id, callback);
    return id;
  }

  removeLogListener(id: Symbol) {
    this.logListeners.delete(id);
    if (this.logListeners.size === 0) {
      this.stopLogging();
    }
  }

  navigateToLocation(_location: string) {
    throw new Error('unimplemented');
  }

  async screenshotAvailable(): Promise<boolean> {
    if (this.isArchived) {
      return false;
    }
    return this.flipperServer.exec('device-supports-screenshot', this.serial);
  }

  async screenshot(): Promise<Buffer> {
    if (this.isArchived) {
      return Buffer.from([]);
    }
    return Buffer.from(
      Base64.toUint8Array(
        await this.flipperServer.exec('device-take-screenshot', this.serial),
      ),
    );
  }

  async screenCaptureAvailable(): Promise<boolean> {
    if (this.isArchived) {
      return false;
    }
    return this.flipperServer.exec(
      'device-supports-screencapture',
      this.serial,
    );
  }

  async startScreenCapture(destination: string): Promise<void> {
    return this.flipperServer.exec(
      'device-start-screencapture',
      this.serial,
      destination,
    );
  }

  async stopScreenCapture(): Promise<string | null> {
    return this.flipperServer.exec('device-stop-screencapture', this.serial);
  }

  async executeShell(command: string): Promise<string> {
    return this.flipperServer.exec('device-shell-exec', this.serial, command);
  }

  async sendMetroCommand(command: string): Promise<void> {
    return this.flipperServer.exec('metro-command', this.serial, command);
  }

  supportsPlugin(plugin: PluginDefinition | PluginDetails) {
    let pluginDetails: PluginDetails;
    if (plugin instanceof _SandyPluginDefinition) {
      pluginDetails = plugin.details;
      if (!pluginDetails.pluginType && !pluginDetails.supportedDevices) {
        // TODO T84453692: this branch is to support plugins defined with the legacy approach. Need to remove this branch after some transition period when
        // all the plugins will be migrated to the new approach with static compatibility metadata in package.json.
        if (plugin instanceof _SandyPluginDefinition) {
          return (
            plugin.isDevicePlugin &&
            (plugin.asDevicePluginModule().supportsDevice?.(this as any) ??
              false)
          );
        } else {
          return (plugin as any).supportsDevice(this);
        }
      }
    } else {
      pluginDetails = plugin;
    }
    return (
      pluginDetails.pluginType === 'device' &&
      (!pluginDetails.supportedDevices ||
        pluginDetails.supportedDevices?.some(
          (d) =>
            (!d.os || d.os === this.os) &&
            (!d.type || d.type === this.deviceType) &&
            (d.archived === undefined || d.archived === this.isArchived) &&
            (!d.specs || d.specs.every((spec) => this.specs.includes(spec))),
        ))
    );
  }

  loadDevicePlugins(
    devicePlugins: PluginMap,
    enabledDevicePlugins: Set<string>,
    pluginStates?: Record<string, any>,
  ) {
    if (!devicePlugins) {
      return;
    }
    const plugins = Array.from(devicePlugins.values()).filter((p) =>
      enabledDevicePlugins?.has(p.id),
    );
    for (const plugin of plugins) {
      this.loadDevicePlugin(plugin, pluginStates?.[plugin.id]);
    }
  }

  loadDevicePlugin(plugin: PluginDefinition, initialState?: any) {
    if (!this.supportsPlugin(plugin)) {
      return;
    }
    this.hasDevicePlugins = true;
    if (plugin instanceof _SandyPluginDefinition) {
      this.sandyPluginStates.set(
        plugin.id,
        new _SandyDevicePluginInstance(
          getFlipperLib(),
          plugin,
          this,
          // break circular dep, one of those days again...
          getPluginKey(undefined, {serial: this.serial}, plugin.id),
          initialState,
        ),
      );
    }
  }

  unloadDevicePlugin(pluginId: string) {
    const instance = this.sandyPluginStates.get(pluginId);
    if (instance) {
      instance.destroy();
      this.sandyPluginStates.delete(pluginId);
    }
  }

  disconnect() {
    this.logListeners.clear();
    this.stopLogging();
    this.connected.set(false);
  }

  destroy() {
    this.disconnect();
    this.sandyPluginStates.forEach((instance) => {
      instance.destroy();
    });
    this.sandyPluginStates.clear();
  }
}
