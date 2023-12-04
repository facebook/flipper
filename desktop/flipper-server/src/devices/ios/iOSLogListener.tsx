/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ChildProcessWithoutNullStreams} from 'child_process';
import {DeviceLogEntry, DeviceLogLevel, DeviceType} from 'flipper-common';
import {Transform} from 'stream';
import {DeviceListener} from '../../utils/DeviceListener';
import {ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB, IOSBridge} from './IOSBridge';
import JSONStream from 'JSONStream';
import split2 from 'split2';

// Used to strip the initial output of the logging utility where it prints out settings.
// We know the log stream is json so it starts with an open brace.
class StripLogPrefix extends Transform {
  passedPrefix = false;

  _transform(
    data: any,
    _encoding: string,
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

type IOSLogLevel = 'Default' | 'Info' | 'Debug' | 'Error' | 'Fault';
type RawLogEntry = {
  eventMessage: string;
  machTimestamp: number;
  messageType: IOSLogLevel;
  processID: number;
  processImagePath: string;
  processImageUUID: string;
  processUniqueID: number;
  senderImagePath: string;
  senderImageUUID: string;
  senderProgramCounter: number;
  threadID: number;
  timestamp: string;
  timezoneName: string;
  traceID: string;
};

// https://regex101.com/r/rrl03T/1
// Mar 25 17:06:38 iPhone symptomsd(SymptomEvaluator)[125] <Notice>: Stuff
const logRegex = /(^.{15}) ([^ ]+?) ([^\[]+?)\[(\d+?)\] <(\w+?)>: (.*)$/s;

// eslint-disable-next-line @typescript-eslint/naming-convention
export class iOSLogListener extends DeviceListener {
  constructor(
    isDeviceConnected: () => boolean,
    private onNewLogEntry: (logEntry: DeviceLogEntry) => void,
    private readonly iOSBridge: IOSBridge,
    private readonly serial: string,
    private readonly deviceType: DeviceType,
  ) {
    super(isDeviceConnected);
  }
  protected async startListener() {
    let log: ChildProcessWithoutNullStreams;
    try {
      log = this.iOSBridge.startLogListener(this.serial, this.deviceType);
    } catch (e) {
      if (e.message === ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB) {
        console.warn(e);
        return () => {};
      } else {
        throw e;
      }
    }

    log.on('error', (err: Error) => {
      console.error('iOS log tailer error', err);
      this._state.set('fatal', err);
    });

    // TODO: Do we need it?
    log.stderr.on('data', (data: Buffer) => {
      console.warn('iOS log tailer stderr: ', data.toString());
    });

    if (this.deviceType === 'physical') {
      log.stdout.pipe(split2('\0')).on('data', (line: string) => {
        const parsed = iOSLogListener.parseLogLine(line);
        if (parsed) {
          this.onNewLogEntry(parsed);
        } else {
          console.warn('Failed to parse iOS log line: ', line);
        }
      });
    } else {
      log.stdout
        .pipe(new StripLogPrefix())
        .pipe(JSONStream.parse('*'))
        .on('data', (data: RawLogEntry) => {
          const entry = iOSLogListener.parseJsonLogEntry(data);
          this.onNewLogEntry(entry);
        });
    }

    return () => {
      log.kill();
    };
  }

  static parseJsonLogEntry(entry: RawLogEntry): DeviceLogEntry {
    let type: DeviceLogLevel = iOSLogListener.getLogLevel(entry.messageType);

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

    const tag = entry.processImagePath.split('/').pop() || '';

    return {
      date: new Date(entry.timestamp),
      pid: entry.processID,
      tid: entry.threadID,
      tag,
      message: entry.eventMessage,
      type,
    };
  }

  static getLogLevel(level: string): DeviceLogLevel {
    switch (level) {
      case 'Default':
        return 'debug';
      case 'Info':
        return 'info';
      case 'Debug':
        return 'debug';
      case 'Error':
        return 'error';
      case 'Notice':
        return 'verbose';
      case 'Fault':
        return 'fatal';
      default:
        return 'unknown';
    }
  }

  static parseLogLine(line: string): DeviceLogEntry | undefined {
    const matches = line.match(logRegex);
    if (matches) {
      return {
        date: new Date(Date.parse(matches[1])),
        tag: matches[3],
        tid: 0,
        pid: parseInt(matches[4], 10),
        type: iOSLogListener.getLogLevel(matches[5]),
        message: matches[6],
      };
    }
    return undefined;
  }
}
