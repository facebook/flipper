/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import BaseDevice from './BaseDevice.tsx';
import type {
  DeviceType,
  OS,
  DeviceShell,
  DeviceLogEntry,
} from './BaseDevice.tsx';

export default class ArchivedDevice extends BaseDevice {
  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    os: OS,
    logEntries: Array<DeviceLogEntry>,
  ) {
    let archivedDeviceType = deviceType;
    if (archivedDeviceType === 'emulator') {
      archivedDeviceType = 'archivedEmulator';
    } else if (archivedDeviceType === 'physical') {
      archivedDeviceType = 'archivedPhysical';
    }
    super(serial, archivedDeviceType, title);
    this.os = os;
    this.logs = logEntries;
  }

  logs: Array<DeviceLogEntry>;

  isArchived = true;

  getLogs() {
    return this.logs;
  }

  clearLogs(): Promise<void> {
    this.logs = [];
    return Promise.resolve();
  }

  spawnShell(): ?DeviceShell {
    return null;
  }
}
