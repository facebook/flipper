/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceType, timeout} from 'flipper-common';
import {ChildProcess} from 'child_process';
import {IOSBridge} from './IOSBridge';
import {ServerDevice} from '../ServerDevice';
import {FlipperServerImpl} from '../../FlipperServerImpl';
import {iOSCrashWatcher} from './iOSCrashUtils';
import {iOSLogListener} from './iOSLogListener';

export default class IOSDevice extends ServerDevice {
  private recording?: {process: ChildProcess; destination: string};
  private iOSBridge: IOSBridge;
  readonly logListener: iOSLogListener;
  readonly crashWatcher: iOSCrashWatcher;

  constructor(
    flipperServer: FlipperServerImpl,
    iOSBridge: IOSBridge,
    serial: string,
    deviceType: DeviceType,
    title: string,
  ) {
    super(flipperServer, {
      serial,
      deviceType,
      title,
      os: 'iOS',
      icon: 'mobile',
      features: {
        screenCaptureAvailable: true,
        screenshotAvailable: true,
      },
    });
    this.iOSBridge = iOSBridge;

    this.logListener = new iOSLogListener(
      () => this.connected,
      (logEntry) => this.addLogEntry(logEntry),
      this.iOSBridge,
      this.serial,
      this.info.deviceType,
    );
    // It is OK not to await the start of the log listener. We just spawn it and handle errors internally.
    this.logListener
      .start()
      .catch((e) =>
        console.error('IOSDevice.logListener.start -> unexpected error', e),
      );
    this.crashWatcher = new iOSCrashWatcher(this);
    // It is OK not to await the start of the crash watcher. We just spawn it and handle errors internally.
    this.crashWatcher
      .start()
      .catch((e) =>
        console.error('IOSDevice.crashWatcher.start -> unexpected error', e),
      );
  }

  async screenshot(): Promise<Buffer> {
    if (!this.connected) {
      return Buffer.from([]);
    }
    return await this.iOSBridge.screenshot(this.serial);
  }

  async navigateToLocation(location: string) {
    return this.iOSBridge.navigate(this.serial, location).catch((err) => {
      console.warn(`Failed to navigate to location ${location}:`, err);
      return err;
    });
  }

  async startScreenCapture(destination: string) {
    const recording = this.recording;
    if (recording) {
      throw new Error(
        `There is already an active recording at ${recording.destination}`,
      );
    }
    const process = this.iOSBridge.recordVideo(this.serial, destination);
    this.recording = {process, destination};
  }

  async stopScreenCapture(): Promise<string> {
    const recording = this.recording;
    if (!recording) {
      throw new Error('No recording in progress');
    }
    const prom = new Promise<void>((resolve, _reject) => {
      recording.process.on(
        'exit',
        async (_code: number | null, _signal: NodeJS.Signals | null) => {
          resolve();
        },
      );
      recording.process.kill('SIGINT');
    });

    const output: string = await timeout<void>(
      5000,
      prom,
      'Timed out to stop a screen capture.',
    )
      .then(() => {
        this.recording = undefined;
        return recording.destination;
      })
      .catch((e) => {
        this.recording = undefined;
        console.warn('Failed to terminate iOS screen recording:', e);
        throw e;
      });
    return output;
  }

  disconnect() {
    if (this.recording) {
      this.stopScreenCapture();
    }
    super.disconnect();
  }
}
