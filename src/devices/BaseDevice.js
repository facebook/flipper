/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type stream from 'stream';
import {SonarDevicePlugin} from 'sonar';

export type DeviceLogEntry = {
  date: Date,
  pid: number,
  tid: number,
  app?: string,
  type: 'unknown' | 'verbose' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  tag: string,
  message: string,
};

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

  // supported device plugins for this platform
  supportedPlugins: Array<string> = [];

  // possible src of icon to display next to the device title
  icon: ?string;

  supportsPlugin = (DevicePlugin: Class<SonarDevicePlugin<>>): boolean => {
    return this.supportedPlugins.includes(DevicePlugin.id);
  };

  // ensure that we don't serialise devices
  toJSON() {
    return null;
  }

  teardown() {}

  supportedColumns(): Array<string> {
    throw new Error('unimplemented');
  }

  addLogListener(listener: DeviceLogListener) {
    throw new Error('unimplemented');
  }

  spawnShell(): DeviceShell {
    throw new Error('unimplemented');
  }
}
