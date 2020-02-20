/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import stream from 'stream';
import {FlipperDevicePlugin} from 'flipper';
import {sortPluginsByName} from '../utils/pluginUtils';

export type LogLevel =
  | 'unknown'
  | 'verbose'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export type DeviceLogEntry = {
  readonly date: Date;
  readonly pid: number;
  readonly tid: number;
  readonly app?: string;
  readonly type: LogLevel;
  readonly tag: string;
  readonly message: string;
};

export type DeviceShell = {
  stdout: stream.Readable;
  stderr: stream.Readable;
  stdin: stream.Writable;
};

export type DeviceLogListener = (entry: DeviceLogEntry) => void;

export type DeviceType =
  | 'emulator'
  | 'physical'
  | 'archivedEmulator'
  | 'archivedPhysical';

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
  devicePlugins!: string[];

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

  teardown() {}

  supportedColumns(): Array<string> {
    return ['date', 'pid', 'tid', 'tag', 'message', 'type', 'time'];
  }

  addLogListener(callback: DeviceLogListener): Symbol {
    const id = Symbol();
    this.logListeners.set(id, callback);
    return id;
  }

  _notifyLogListeners(entry: DeviceLogEntry) {
    if (this.logListeners.size > 0) {
      this.logListeners.forEach(listener => {
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

  getLogs() {
    return this.logEntries;
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

  loadDevicePlugins(devicePlugins?: Map<string, typeof FlipperDevicePlugin>) {
    this.devicePlugins = Array.from(devicePlugins ? devicePlugins.values() : [])
      .filter(plugin => plugin.supportsDevice(this))
      .sort(sortPluginsByName)
      .map(plugin => plugin.id);
  }
}
