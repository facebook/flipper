/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceDescription, DeviceLogEntry} from 'flipper-common';
import {DeviceListener, NoopListener} from '../utils/DeviceListener';
import {FlipperServerImpl} from '../FlipperServerImpl';

export abstract class ServerDevice {
  readonly info: DeviceDescription;
  readonly flipperServer: FlipperServerImpl;
  connected = true;

  protected stopCrashWatcherCb?: () => void;

  readonly logListener: DeviceListener = new NoopListener(() => this.connected);
  readonly crashWatcher: DeviceListener = new NoopListener(
    () => this.connected,
  );

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
  disconnect(): void {
    this.connected = false;
    this.info.features.screenCaptureAvailable = false;
    this.info.features.screenshotAvailable = false;
    this.logListener.stop();
    this.crashWatcher.stop();
    this.flipperServer.pluginManager.stopAllServerAddOns(this.info.serial);
  }

  screenshot(): Promise<Buffer> {
    return Promise.reject(
      new Error('No screenshot support for current device'),
    );
  }

  async startScreenCapture(_destination: string): Promise<void> {
    throw new Error('startScreenCapture not implemented');
  }

  async stopScreenCapture(): Promise<string> {
    throw new Error('stopScreenCapture not implemented');
  }

  async executeShell(_command: string): Promise<string> {
    throw new Error('executeShell not implemented');
  }

  async forwardPort(_local: string, _remote: string): Promise<boolean> {
    throw new Error('forwardPort not implemented');
  }

  async clearLogs(): Promise<void> {}

  async navigateToLocation(_location: string) {
    throw new Error('navigateLocation not implemented');
  }

  async installApp(_appBundlePath: string): Promise<void> {
    throw new Error('installApp not implemented');
  }

  async openApp(_name: string): Promise<void> {
    throw new Error('openApp not implemented');
  }
}
