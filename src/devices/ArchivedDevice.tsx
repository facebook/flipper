/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from './BaseDevice';
import {DeviceType, OS, DeviceShell, DeviceLogEntry} from './BaseDevice';
import {SupportFormV2State} from '../reducers/supportForm';

function normalizeArchivedDeviceType(deviceType: DeviceType): DeviceType {
  let archivedDeviceType = deviceType;
  if (archivedDeviceType === 'emulator') {
    archivedDeviceType = 'archivedEmulator';
  } else if (archivedDeviceType === 'physical') {
    archivedDeviceType = 'archivedPhysical';
  }
  return archivedDeviceType;
}

export default class ArchivedDevice extends BaseDevice {
  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    os: OS,
    logEntries: Array<DeviceLogEntry>,
    source: string = '',
    supportRequestDetails?: SupportFormV2State,
  ) {
    super(serial, normalizeArchivedDeviceType(deviceType), title, os);
    this.logs = logEntries;
    this.source = source;
    this.supportRequestDetails = supportRequestDetails;
  }

  logs: Array<DeviceLogEntry>;

  isArchived = true;

  supportRequestDetails?: SupportFormV2State;

  getLogs() {
    return this.logs;
  }

  clearLogs(): Promise<void> {
    this.logs = [];
    return Promise.resolve();
  }

  spawnShell(): DeviceShell | undefined | null {
    return null;
  }
}
