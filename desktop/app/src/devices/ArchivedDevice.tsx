/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from './BaseDevice';
import type {DeviceType} from 'flipper-plugin';
import {OS, DeviceShell} from './BaseDevice';
import {SupportFormRequestDetailsState} from '../reducers/supportForm';

export default class ArchivedDevice extends BaseDevice {
  constructor(options: {
    serial: string;
    deviceType: DeviceType;
    title: string;
    os: OS;
    screenshotHandle: string | null;
    source?: string;
    supportRequestDetails?: SupportFormRequestDetailsState;
  }) {
    super(options.serial, options.deviceType, options.title, options.os);
    this.source = options.source || '';
    this.supportRequestDetails = options.supportRequestDetails;
    this.archivedScreenshotHandle = options.screenshotHandle;
  }

  archivedScreenshotHandle: string | null;
  isArchived = true;

  displayTitle(): string {
    return `${this.title} ${this.source ? '(Imported)' : '(Offline)'}`;
  }

  supportRequestDetails?: SupportFormRequestDetailsState;

  spawnShell(): DeviceShell | undefined | null {
    return null;
  }

  getArchivedScreenshotHandle(): string | null {
    return this.archivedScreenshotHandle;
  }
}
