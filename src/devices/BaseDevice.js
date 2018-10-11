/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type stream from 'stream';

export type LogLevel =
  | 'unknown'
  | 'verbose'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export type DeviceLogEntry = {|
  date: Date,
  pid: number,
  tid: number,
  app?: string,
  type: LogLevel,
  tag: string,
  message: string,
|};

export type DeviceShell = {
  stdout: stream.Readable,
  stderr: stream.Readable,
  stdin: stream.Writable,
};

export type DeviceLogListener = (entry: DeviceLogEntry) => void;

export type DeviceType = 'emulator' | 'physical';

export default class BaseDevice {
  constructor(serial: string, deviceType: DeviceType, title: string) {
    this.serial = serial;
    this.title = title;
    this.deviceType = deviceType;
  }

  // operating system of this device
  os: string;

  // human readable name for this device
  title: string;

  // type of this device
  deviceType: DeviceType;

  // serial number for this device
  serial: string;

  // possible src of icon to display next to the device title
  icon: ?string;

  logListeners: Map<Symbol, DeviceLogListener> = new Map();
  logEntries: Array<DeviceLogEntry> = [];

  supportsOS(os: string) {
    return os.toLowerCase() === this.os.toLowerCase();
  }

  toJSON() {
    return `<${this.constructor.name}#${this.title}>`;
  }

  teardown() {}

  supportedColumns(): Array<string> {
    throw new Error('unimplemented');
  }

  addLogListener(callback: DeviceLogListener): Symbol {
    const id = Symbol();
    this.logListeners.set(id, callback);
    this.logEntries.map(callback);
    return id;
  }

  notifyLogListeners(entry: DeviceLogEntry) {
    this.logEntries.push(entry);
    if (this.logListeners.size > 0) {
      this.logListeners.forEach(listener => listener(entry));
    }
  }

  removeLogListener(id: Symbol) {
    this.logListeners.delete(id);
  }

  spawnShell(): DeviceShell {
    throw new Error('unimplemented');
  }
}
