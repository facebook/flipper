/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {DeviceClient as ADBClient} from '@u4/adbkit';
import {Priority, Reader} from '@u4/adbkit-logcat';
import {DeviceLogEntry, DeviceLogLevel} from 'flipper-common';
import {DeviceListener} from '../../utils/DeviceListener';

export class AndroidLogListener extends DeviceListener {
  constructor(
    isDeviceConnected: () => boolean,
    private onNewLogEntry: (logEntry: DeviceLogEntry) => void,
    private readonly adb: ADBClient,
  ) {
    super(isDeviceConnected);
  }
  protected async startListener() {
    const reader = (await this.adb.openLogcat({
      clear: true,
    })) as Reader;

    let gracefulShutdown = false;
    let lastKnownError: Error | undefined;

    reader
      .on('entry', (entry) => {
        let type: DeviceLogLevel = 'unknown';
        if (entry.priority === Priority.VERBOSE) {
          type = 'verbose';
        }
        if (entry.priority === Priority.DEBUG) {
          type = 'debug';
        }
        if (entry.priority === Priority.INFO) {
          type = 'info';
        }
        if (entry.priority === Priority.WARN) {
          type = 'warn';
        }
        if (entry.priority === Priority.ERROR) {
          type = 'error';
        }
        if (entry.priority === Priority.FATAL) {
          type = 'fatal';
        }

        this.onNewLogEntry({
          tag: entry.tag,
          pid: entry.pid,
          tid: entry.tid,
          message: entry.message,
          date: entry.date,
          type,
        });
      })
      .on('end', () => {
        if (!gracefulShutdown) {
          // logs didn't stop gracefully
          console.warn('Unexpected shutdown of adb logcat');
          this._state.set(
            'fatal',
            lastKnownError ?? new Error('Unexpected shutdown of adb logcat'),
          );
        }
      })
      .on('error', (e) => {
        console.warn('Failed to read from adb logcat: ', e);
        lastKnownError = e;
      });

    return () => {
      gracefulShutdown = true;
      reader.end();
    };
  }
}
