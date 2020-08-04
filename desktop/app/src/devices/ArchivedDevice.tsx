/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceLogEntry, DeviceType} from 'flipper-plugin';
import BaseDevice from './BaseDevice';
import {OS, DeviceShell} from './BaseDevice';
import {SupportFormRequestDetailsState} from '../reducers/supportForm';

export default class ArchivedDevice extends BaseDevice {
  constructor(options: {
    serial: string;
    deviceType: DeviceType;
    title: string;
    os: OS;
    logEntries: Array<DeviceLogEntry>;
    screenshotHandle: string | null;
    source?: string;
    supportRequestDetails?: SupportFormRequestDetailsState;
  }) {
    super(options.serial, options.deviceType, options.title, options.os);
    this.logs = options.logEntries;
    this.source = options.source || '';
    this.supportRequestDetails = options.supportRequestDetails;
    this.archivedScreenshotHandle = options.screenshotHandle;
  }

  logs: Array<DeviceLogEntry>;
  archivedScreenshotHandle: string | null;
  isArchived = true;

  displayTitle(): string {
    return `${this.title} ${this.source ? '(Imported)' : '(Offline)'}`;
  }

  supportRequestDetails?: SupportFormRequestDetailsState;

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

  getArchivedScreenshotHandle(): string | null {
    return this.archivedScreenshotHandle;
  }
}
