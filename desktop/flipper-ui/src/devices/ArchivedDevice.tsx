/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from './BaseDevice';
import type {DeviceOS, DeviceType} from 'flipper-plugin';

export default class ArchivedDevice extends BaseDevice {
  isArchived = true;

  constructor(options: {
    serial: string;
    deviceType: DeviceType;
    title: string;
    os: DeviceOS;
    screenshotHandle?: string | null;
    source?: string;
    supportRequestDetails?: object;
  }) {
    super(
      {
        async connect() {},
        close() {},
        exec(command, ..._args: any[]) {
          throw new Error(
            `[Archived device] Cannot invoke command ${command} on an archived device`,
          );
        },
        on(event) {
          console.warn(
            `Cannot subscribe to server events from an Archived device: ${event}`,
          );
        },
        off() {},
      },
      {
        deviceType: options.deviceType,
        title: options.title,
        os: options.os,
        serial: options.serial,
        icon: 'box',
        features: {
          screenCaptureAvailable: false,
          screenshotAvailable: false,
        },
      },
    );
    this.connected.set(false);
    this.source = options.source || '';
    this.supportRequestDetails = options.supportRequestDetails;
    this.archivedScreenshotHandle = options.screenshotHandle ?? null;
  }

  archivedScreenshotHandle: string | null;

  displayTitle(): string {
    return `${this.title} ${this.source ? '(Imported)' : '(Offline)'}`;
  }

  supportRequestDetails?: object;

  getArchivedScreenshotHandle(): string | null {
    return this.archivedScreenshotHandle;
  }

  /**
   * @override
   */
  async startLogging() {
    // No-op
  }

  /**
   * @override
   */
  async stopLogging() {
    // No-op
  }
}
