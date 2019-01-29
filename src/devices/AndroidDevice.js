/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {DeviceType, DeviceShell} from './BaseDevice.js';
import type {Store} from '../reducers/index';

import {Priority} from 'adbkit-logcat-fb';
import child_process from 'child_process';
import BaseDevice from './BaseDevice.js';

type ADBClient = any;

export default class AndroidDevice extends BaseDevice {
  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    adb: ADBClient,
  ) {
    super(serial, deviceType, title);
    this.adb = adb;

    this.adb.openLogcat(this.serial).then(reader => {
      reader.on('entry', entry => {
        if (this.logListeners.size > 0) {
          let type = 'unknown';
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
          this.notifyLogListeners({
            tag: entry.tag,
            pid: entry.pid,
            tid: entry.tid,
            message: entry.message,
            date: entry.date,
            type,
          });
        }
      });
    });
  }

  icon = 'icons/android.svg';
  os = 'Android';
  adb: ADBClient;
  pidAppMapping: {[key: number]: string} = {};
  logReader: any;

  supportedColumns(): Array<string> {
    return ['date', 'pid', 'tid', 'tag', 'message', 'type', 'time'];
  }

  reverse(ports: [number]): Promise<void> {
    return Promise.all(
      ports.map(port =>
        this.adb.reverse(this.serial, `tcp:${port}`, `tcp:${port}`),
      ),
    ).then(() => {
      return;
    });
  }

  spawnShell(): DeviceShell {
    return child_process.spawn('adb', ['-s', this.serial, 'shell', '-t', '-t']);
  }
}
