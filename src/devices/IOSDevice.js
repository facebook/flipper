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
import child_process from 'child_process';
import BaseDevice from './BaseDevice.js';
import JSONStream from 'JSONStream';
import {Transform} from 'stream';

type RawLogEntry = {
  activityID: string, // Number in string format
  eventMessage: string,
  eventType: string,
  machTimestamp: number,
  processID: number,
  processImagePath: string,
  processImageUUID: string,
  processUniqueID: number,
  senderImagePath: string,
  senderImageUUID: string,
  senderProgramCounter: number,
  threadID: number,
  timestamp: string, // "2017-09-27 16:21:15.771213-0400"
  timezoneName: string,
  traceID: string,
};

export default class IOSDevice extends BaseDevice {
  supportedPlugins = ['DeviceLogs'];
  icon = 'icons/ios.svg';
  os = 'iOS';

  log: any;
  buffer: string;

  constructor(serial: string, deviceType: DeviceType, title: string) {
    super(serial, deviceType, title);

    this.buffer = '';
    this.log = null;
  }

  teardown() {
    if (this.log) {
      this.log.kill();
    }
  }

  supportedColumns(): Array<string> {
    return ['date', 'pid', 'tid', 'tag', 'message', 'type', 'time'];
  }

  addLogListener(callback: DeviceLogListener) {
    if (!this.log) {
      this.log = child_process.spawn(
        'xcrun',
        [
          'simctl',
          'spawn',
          'booted',
          'log',
          'stream',
          '--style',
          'json',
          '--predicate',
          'senderImagePath contains "Containers"',
          '--info',
          '--debug',
        ],
        {},
      );

      this.log.on('error', err => {
        console.error(err);
      });

      this.log.stderr.on('data', data => {
        console.error(data.toString());
      });

      this.log.on('exit', () => {
        this.log = null;
      });
    }

    this.log.stdout
      .pipe(new StripLogPrefix())
      .pipe(JSONStream.parse('*'))
      .on('data', (data: RawLogEntry) => {
        callback(IOSDevice.parseLogEntry(data));
      });
  }

  static parseLogEntry(entry: RawLogEntry): DeviceLogEntry {
    let type = 'unknown';
    if (entry.eventMessage.indexOf('[debug]') !== -1) {
      type = 'debug';
    } else if (entry.eventMessage.indexOf('[info]') !== -1) {
      type = 'info';
    } else if (entry.eventMessage.indexOf('[warn]') !== -1) {
      type = 'warn';
    } else if (entry.eventMessage.indexOf('[error]') !== -1) {
      type = 'error';
    }

    // remove timestamp in front of message
    entry.eventMessage = entry.eventMessage.replace(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} /,
      '',
    );

    // remove type from mesage
    entry.eventMessage = entry.eventMessage.replace(
      /^\[(debug|info|warn|error)\]/,
      '',
    );

    const tags = entry.processImagePath.split('/');
    const tag = tags[tags.length - 1];

    return {
      date: new Date(entry.timestamp),
      pid: entry.processID,
      tid: entry.threadID,
      tag,
      message: entry.eventMessage,
      type,
    };
  }
}

// Used to strip the initial output of the logging utility where it prints out settings.
// We know the log stream is json so it starts with an open brace.
class StripLogPrefix extends Transform {
  passedPrefix = false;

  _transform(
    data: any,
    encoding: string,
    callback: (err?: Error, data?: any) => void,
  ) {
    if (this.passedPrefix) {
      this.push(data);
    } else {
      const dataString = data.toString();
      const index = dataString.indexOf('[');
      if (index >= 0) {
        this.push(dataString.substring(index));
        this.passedPrefix = true;
      }
    }
    callback();
  }
}
