/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import BaseDevice, {DeviceType, DeviceShell, LogLevel} from './BaseDevice';
import {Priority} from 'adbkit-logcat-fb';
import child_process from 'child_process';
import {spawn} from 'promisify-child-process';
import ArchivedDevice from './ArchivedDevice';
import {ReadStream} from 'fs';

type ADBClient = any;

export default class AndroidDevice extends BaseDevice {
  constructor(
    serial: string,
    deviceType: DeviceType,
    title: string,
    adb: ADBClient,
  ) {
    super(serial, deviceType, title, 'Android');
    this.adb = adb;
    this.icon = 'icons/android.svg';
    this.adb.openLogcat(this.serial).then(reader => {
      reader.on('entry', entry => {
        let type: LogLevel = 'unknown';
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

        this.addLogEntry({
          tag: entry.tag,
          pid: entry.pid,
          tid: entry.tid,
          message: entry.message,
          date: entry.date,
          type,
        });
      });
    });
  }

  adb: ADBClient;
  pidAppMapping: {[key: number]: string} = {};
  logReader: any;

  supportedColumns(): Array<string> {
    return ['date', 'pid', 'tid', 'tag', 'message', 'type', 'time'];
  }

  reverse(ports: [number, number]): Promise<void> {
    return Promise.all(
      ports.map(port =>
        this.adb.reverse(this.serial, `tcp:${port}`, `tcp:${port}`),
      ),
    ).then(() => {
      return;
    });
  }

  spawnShell(): DeviceShell | null | undefined {
    return child_process.spawn('adb', ['-s', this.serial, 'shell', '-t', '-t']);
  }

  clearLogs(): Promise<void> {
    this.logEntries = [];
    return spawn('adb', ['logcat', '-c'])
      .then(_ => undefined);
  }

  archive(): ArchivedDevice {
    return new ArchivedDevice(
      this.serial,
      this.deviceType,
      this.title,
      this.os,
      [...this.logEntries],
    );
  }

  navigateToLocation(location: string) {
    const shellCommand = `am start ${encodeURI(location)}`;
    this.adb.shell(this.serial, shellCommand);
  }

  screenshot(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.adb.screencap(this.serial).then((stream: ReadStream) => {
        const chunks: Array<Buffer> = [];
        stream
          .on('data', (chunk: Buffer) => chunks.push(chunk))
          .once('end', () => {
            resolve(Buffer.concat(chunks));
          })
          .once('error', reject);
      });
    });
  }
}
