/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import stream from 'stream';
import {DeviceLogListener} from 'flipper';
import {sortPluginsByName} from '../utils/pluginUtils';
import {
  DeviceLogEntry,
  SandyDevicePluginInstance,
  SandyPluginDefinition,
  DeviceType,
} from 'flipper-plugin';
import {DevicePluginMap, FlipperDevicePlugin} from '../plugin';

export type DeviceShell = {
  stdout: stream.Readable;
  stderr: stream.Readable;
  stdin: stream.Writable;
};

export type DeviceExport = {
  os: OS;
  title: string;
  deviceType: DeviceType;
  serial: string;
  logs: Array<DeviceLogEntry>;
};

export type OS = 'iOS' | 'Android' | 'Windows' | 'MacOS' | 'JSWebApp' | 'Metro';

export default class BaseDevice {
  constructor(serial: string, deviceType: DeviceType, title: string, os: OS) {
    this.serial = serial;
    this.title = title;
    this.deviceType = deviceType;
    this.os = os;
  }

  // operating system of this device
  os: OS;

  // human readable name for this device
  title: string;

  // type of this device
  deviceType: DeviceType;

  // serial number for this device
  serial: string;

  // possible src of icon to display next to the device title
  icon: string | null | undefined;

  logListeners: Map<Symbol, DeviceLogListener> = new Map();
  logEntries: Array<DeviceLogEntry> = [];
  isArchived: boolean = false;
  // if imported, stores the original source location
  source = '';

  // sorted list of supported device plugins
  devicePlugins: string[] = [];

  sandyPluginStates: Map<string, SandyDevicePluginInstance> = new Map<
    string,
    SandyDevicePluginInstance
  >();

  supportsOS(os: OS) {
    return os.toLowerCase() === this.os.toLowerCase();
  }

  displayTitle(): string {
    return this.title;
  }

  toJSON(): DeviceExport {
    return {
      os: this.os,
      title: this.title,
      deviceType: this.deviceType,
      serial: this.serial,
      logs: this.getLogs(),
    };
  }

  teardown() {
    for (const instance of this.sandyPluginStates.values()) {
      instance.destroy();
    }
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
    this.logEntries.push(entry);
    this._notifyLogListeners(entry);
  }

  getLogs(startDate: Date | null = null) {
    return startDate != null
      ? this.logEntries.filter((log) => {
          return log.date > startDate;
        })
      : this.logEntries;
  }

  clearLogs(): Promise<void> {
    // Only for device types that allow clearing.
    this.logEntries = [];
    return Promise.resolve();
  }

  removeLogListener(id: Symbol) {
    this.logListeners.delete(id);
  }

  navigateToLocation(_location: string) {
    throw new Error('unimplemented');
  }

  archive(): any | null | undefined {
    return null;
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

  loadDevicePlugins(devicePlugins?: DevicePluginMap) {
    if (!devicePlugins) {
      return;
    }
    const plugins = Array.from(devicePlugins.values());
    plugins.sort(sortPluginsByName);
    for (const plugin of plugins) {
      this.loadDevicePlugin(plugin);
    }
  }

  loadDevicePlugin(plugin: typeof FlipperDevicePlugin | SandyPluginDefinition) {
    if (plugin instanceof SandyPluginDefinition) {
      if (plugin.asDevicePluginModule().supportsDevice(this as any)) {
        this.devicePlugins.push(plugin.id);
        this.sandyPluginStates.set(
          plugin.id,
          new SandyDevicePluginInstance(this, plugin),
        ); // TODO T70582933: pass initial state if applicable
      }
    } else {
      if (plugin.supportsDevice(this)) {
        this.devicePlugins.push(plugin.id);
      }
    }
  }
}
