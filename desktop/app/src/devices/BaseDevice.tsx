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
} from 'flipper-plugin';
import {
  DevicePluginDefinition,
  DevicePluginMap,
  FlipperDevicePlugin,
} from '../plugin';
import {getFlipperLibImplementation} from '../utils/flipperLibImplementation';
import {DeviceSpec, OS as PluginOS, PluginDetails} from 'flipper-plugin-lib';

export type DeviceShell = {
  stdout: stream.Readable;
  stderr: stream.Readable;
  stdin: stream.Writable;
};

export type OS = PluginOS | 'Windows' | 'MacOS' | 'JSWebApp';

export type DeviceExport = {
  os: OS;
  title: string;
  deviceType: DeviceType;
  serial: string;
  pluginStates: Record<string, any>;
};

export default class BaseDevice {
  isArchived = false;

  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    os: OS,
    specs: DeviceSpec[] = [],
  ) {
    this.serial = serial;
    this.title = title;
    this.deviceType = deviceType;
    this.os = os;
    this.specs = specs;
  }

  // operating system of this device
  os: OS;

  // human readable name for this device
  title: string;

  // type of this device
  deviceType: DeviceType;

  // serial number for this device
  serial: string;

  // additional device specs used for plugin compatibility checks
  specs: DeviceSpec[];

  // possible src of icon to display next to the device title
  icon: string | null | undefined;

  logListeners: Map<Symbol, DeviceLogListener> = new Map();

  readonly connected = createState(true);

  // if imported, stores the original source location
  source = '';

  // sorted list of supported device plugins
  devicePlugins: string[] = [];

  sandyPluginStates: Map<string, _SandyDevicePluginInstance> = new Map<
    string,
    _SandyDevicePluginInstance
  >();

  supportsOS(os: OS) {
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

  addLogListener(callback: DeviceLogListener): Symbol {
    const id = Symbol();
    this.logListeners.set(id, callback);
    return id;
  }

  _notifyLogListeners(entry: DeviceLogEntry) {
    if (this.logListeners.size > 0) {
      this.logListeners.forEach((listener) => {
        // prevent breaking other listeners, if one listener doesn't work.
        try {
          listener(entry);
        } catch (e) {
          console.error(`Log listener exception:`, e);
        }
      });
    }
  }

  addLogEntry(entry: DeviceLogEntry) {
    this._notifyLogListeners(entry);
  }

  removeLogListener(id: Symbol) {
    this.logListeners.delete(id);
  }

  navigateToLocation(_location: string) {
    throw new Error('unimplemented');
  }

  screenshot(): Promise<Buffer> {
    return Promise.reject(
      new Error('No screenshot support for current device'),
    );
  }

  async screenCaptureAvailable(): Promise<boolean> {
    return false;
  }

  async startScreenCapture(_destination: string): Promise<void> {
    throw new Error('startScreenCapture not implemented on BaseDevice ');
  }

  async stopScreenCapture(): Promise<string | null> {
    return null;
  }

  supportsPlugin(plugin: DevicePluginDefinition | PluginDetails) {
    let pluginDetails: PluginDetails;
    if (isDevicePluginDefinition(plugin)) {
      pluginDetails = plugin.details;
      if (!pluginDetails.pluginType && !pluginDetails.supportedDevices) {
        // TODO T84453692: this branch is to support plugins defined with the legacy approach. Need to remove this branch after some transition period when
        // all the plugins will be migrated to the new approach with static compatibility metadata in package.json.
        if (plugin instanceof _SandyPluginDefinition) {
          return (
            plugin.isDevicePlugin &&
            plugin.asDevicePluginModule().supportsDevice(this as any)
          );
        } else {
          return plugin.supportsDevice(this);
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
    devicePlugins: DevicePluginMap,
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

  loadDevicePlugin(plugin: DevicePluginDefinition, initialState?: any) {
    if (!this.supportsPlugin(plugin)) {
      return;
    }
    this.devicePlugins.push(plugin.id);
    if (plugin instanceof _SandyPluginDefinition) {
      this.sandyPluginStates.set(
        plugin.id,
        new _SandyDevicePluginInstance(
          getFlipperLibImplementation(),
          plugin,
          this,
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
    const index = this.devicePlugins.indexOf(pluginId);
    if (index >= 0) {
      this.devicePlugins.splice(index, 1);
    }
  }

  disconnect() {
    this.logListeners.clear();
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

function isDevicePluginDefinition(
  definition: any,
): definition is DevicePluginDefinition {
  return (
    (definition as any).prototype instanceof FlipperDevicePlugin ||
    (definition instanceof _SandyPluginDefinition && definition.isDevicePlugin)
  );
}
