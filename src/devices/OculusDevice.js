/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  DeviceType,
  DeviceLogEntry,
  DeviceLogListener,
} from './BaseDevice.js';

import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import BaseDevice from './BaseDevice.js';

function getLogsPath(fileName: ?string): string {
  const dir = '/AppData/Local/Oculus/';
  if (fileName) {
    return path.join(os.homedir(), dir, fileName);
  }
  return path.join(os.homedir(), dir);
}

export default class OculusDevice extends BaseDevice {
  supportedPlugins = ['DeviceLogs'];
  icon = 'icons/oculus.png';
  os = 'Oculus';

  watcher: any;
  processedFileMap: {};
  watchedFile: ?string;
  timer: TimeoutID;

  constructor(serial: string, deviceType: DeviceType, title: string) {
    super(serial, deviceType, title);

    this.watcher = null;
    this.processedFileMap = {};
  }

  teardown() {
    clearTimeout(this.timer);
    const file = this.watchedFile;
    if (file) {
      fs.unwatchFile(path.join(getLogsPath(), file));
    }
  }

  supportedColumns(): Array<string> {
    return ['date', 'tag', 'message', 'type', 'time'];
  }

  mapLogLevel(type: string): $PropertyType<DeviceLogEntry, 'type'> {
    switch (type) {
      case 'WARNING':
        return 'warn';
      case '!ERROR!':
        return 'error';
      case 'DEBUG':
        return 'debug';
      case 'INFO':
        return 'info';
      default:
        return 'verbose';
    }
  }

  processText(text: Buffer, callback: DeviceLogListener) {
    text
      .toString()
      .split('\r\n')
      .forEach(line => {
        const regex = /(.*){(\S+)}\s*\[([\w :.\\]+)\](.*)/;
        const match = regex.exec(line);
        if (match && match.length === 5) {
          callback({
            tid: 0,
            pid: 0,
            date: new Date(Date.parse(match[1])),
            type: this.mapLogLevel(match[2]),
            tag: match[3],
            message: match[4],
          });
        } else if (line.trim() === '') {
          // skip
        } else {
          callback({
            tid: 0,
            pid: 0,
            date: new Date(),
            type: 'verbose',
            tag: 'failed-parse',
            message: line,
          });
        }
      });
  }

  addLogListener = (callback: DeviceLogListener) => {
    this.setupListener(callback);
  };

  async setupListener(callback: DeviceLogListener) {
    const files = await fs.readdir(getLogsPath());
    this.watchedFile = files
      .filter(file => file.startsWith('Service_'))
      .sort()
      .pop();
    this.watch(callback);
    this.timer = setTimeout(() => this.checkForNewLog(callback), 5000);
  }

  watch(callback: DeviceLogListener) {
    const filePath = getLogsPath(this.watchedFile);
    fs.watchFile(filePath, async (current, previous) => {
      const readLen = current.size - previous.size;
      const buffer = new Buffer(readLen);
      const fd = await fs.open(filePath, 'r');
      await fs.read(fd, buffer, 0, readLen, previous.size);
      this.processText(buffer, callback);
    });
  }

  async checkForNewLog(callback: DeviceLogListener) {
    const files = await fs.readdir(getLogsPath());
    const latestLog = files
      .filter(file => file.startsWith('Service_'))
      .sort()
      .pop();
    if (this.watchedFile !== latestLog) {
      const oldFilePath = getLogsPath(this.watchedFile);
      fs.unwatchFile(oldFilePath);
      this.watchedFile = latestLog;
      this.watch(callback);
    }
    this.timer = setTimeout(() => this.checkForNewLog(callback), 5000);
  }
}
