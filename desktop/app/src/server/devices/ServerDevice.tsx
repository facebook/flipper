/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createState, DeviceDescription, DeviceLogEntry} from 'flipper-plugin';
import {FlipperServerImpl} from '../FlipperServerImpl';

export abstract class ServerDevice {
  readonly info: DeviceDescription;
  readonly connected = createState(true);
  readonly flipperServer: FlipperServerImpl;

  constructor(flipperServer: FlipperServerImpl, info: DeviceDescription) {
    this.flipperServer = flipperServer;
    this.info = info;
  }

  get serial(): string {
    return this.info.serial;
  }

  addLogEntry(entry: DeviceLogEntry) {
    this.flipperServer.emit('device-log', {
      serial: this.serial,
      entry,
    });
  }

  /**
   * The device might have no active connection
   */
  disconnect(): void {}

  startLogging() {
    // to be subclassed
  }

  stopLogging() {
    // to be subclassed
  }

  async screenshotAvailable(): Promise<boolean> {
    return false;
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

  async stopScreenCapture(): Promise<string> {
    throw new Error('stopScreenCapture not implemented on BaseDevice ');
  }

  async executeShell(_command: string): Promise<string> {
    throw new Error('executeShell not implemented on BaseDevice');
  }

  async forwardPort(_local: string, _remote: string): Promise<void> {
    throw new Error('forwardPort not implemented on BaseDevice');
  }
}
