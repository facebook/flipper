/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {DeviceType, LogLevel, DeviceLogEntry} from './BaseDevice.js';
import child_process from 'child_process';
import BaseDevice from './BaseDevice.js';
import JSONStream from 'JSONStream';
import {Transform} from 'stream';

type IOSLogLevel = 'Default' | 'Info' | 'Debug' | 'Error' | 'Fault';

type RawLogEntry = {|
  eventMessage: string,
  machTimestamp: number,
  messageType: IOSLogLevel,
  processID: number,
  processImagePath: string,
  processImageUUID: string,
  processUniqueID: number,
  senderImagePath: string,
  senderImageUUID: string,
  senderProgramCounter: number,
  threadID: number,
  timestamp: string,
  timezoneName: string,
  traceID: string,
|};

export default class IOSDevice extends BaseDevice {
  icon = 'icons/ios.svg';
  os = 'iOS';

  log: any;
  buffer: string;

  constructor(serial: string, deviceType: DeviceType, title: string) {
    super(serial, deviceType, title);

    this.buffer = '';
    this.log = this.startLogListener();
  }

  teardown() {
    if (this.log) {
      this.log.kill();
    }
  }

  supportedColumns(): Array<string> {
    return ['date', 'pid', 'tid', 'tag', 'message', 'type', 'time'];
  }

  startLogListener(retries: number = 3) {
    if (this.deviceType === 'physical') {
      return;
    }
    if (retries === 0) {
      console.error('Attaching iOS log listener continuously failed.');
      return;
    }
    if (!this.log) {
      const deviceSetPath = process.env.DEVICE_SET_PATH
        ? ['--set', process.env.DEVICE_SET_PATH]
        : [];

      this.log = child_process.spawn(
        'xcrun',
        [
          'simctl',
          ...deviceSetPath,
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

    try {
      this.log.stdout
        .pipe(new StripLogPrefix())
        .pipe(JSONStream.parse('*'))
        .on('data', (data: RawLogEntry) => {
          const entry = IOSDevice.parseLogEntry(data);
          this.addLogEntry(entry);
        });
    } catch (e) {
      console.error('Could not parse iOS log stream.', e);
      // restart log stream
      this.log.kill();
      this.log = null;
      this.startLogListener(retries - 1);
    }
  }

  static parseLogEntry(entry: RawLogEntry): DeviceLogEntry {
    const LOG_MAPPING: Map<IOSLogLevel, LogLevel> = new Map([
      ['Default', 'debug'],
      ['Info', 'info'],
      ['Debug', 'debug'],
      ['Error', 'error'],
      ['Fault', 'fatal'],
    ]);
    let type: LogLevel = LOG_MAPPING.get(entry.messageType) || 'unknown';

    // when Apple log levels are not used, log messages can be prefixed with
    // their loglevel.
    if (entry.eventMessage.startsWith('[debug]')) {
      type = 'debug';
    } else if (entry.eventMessage.startsWith('[info]')) {
      type = 'info';
    } else if (entry.eventMessage.startsWith('[warn]')) {
      type = 'warn';
    } else if (entry.eventMessage.startsWith('[error]')) {
      type = 'error';
    }
    // remove type from mesage
    entry.eventMessage = entry.eventMessage.replace(
      /^\[(debug|info|warn|error)\]/,
      '',
    );

    const tag = entry.processImagePath.split('/').pop();

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
