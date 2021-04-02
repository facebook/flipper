/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {LogLevel, DeviceLogEntry, DeviceType} from 'flipper-plugin';
import child_process, {ChildProcess} from 'child_process';
import BaseDevice from './BaseDevice';
import JSONStream from 'JSONStream';
import {Transform} from 'stream';
import electron from 'electron';
import fs from 'fs';
import {v1 as uuid} from 'uuid';
import path from 'path';
import {promisify} from 'util';
import {exec} from 'child_process';
import {default as promiseTimeout} from '../utils/promiseTimeout';
import {IOSBridge} from '../utils/IOSBridge';
import split2 from 'split2';

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

export default class IOSDevice extends BaseDevice {
  log?: child_process.ChildProcessWithoutNullStreams;
  buffer: string;
  private recordingProcess?: ChildProcess;
  private recordingLocation?: string;
  private iOSBridge: IOSBridge;

  constructor(
    iOSBridge: IOSBridge,
    serial: string,
    deviceType: DeviceType,
    title: string,
  ) {
    super(serial, deviceType, title, 'iOS');
    this.icon = 'mobile';
    this.buffer = '';
    this.iOSBridge = iOSBridge;
  }

  async screenshot(): Promise<Buffer> {
    if (!this.connected.get()) {
      return Buffer.from([]);
    }
    const tmpImageName = uuid() + '.png';
    const tmpDirectory = (electron.app || electron.remote.app).getPath('temp');
    const tmpFilePath = path.join(tmpDirectory, tmpImageName);
    const command =
      this.deviceType === 'emulator'
        ? `xcrun simctl io ${this.serial} screenshot ${tmpFilePath}`
        : `idb screenshot --udid ${this.serial} ${tmpFilePath}`;
    return promisify(exec)(command)
      .then(() => promisify(fs.readFile)(tmpFilePath))
      .then((buffer) => {
        return promisify(fs.unlink)(tmpFilePath).then(() => buffer);
      });
  }

  navigateToLocation(location: string) {
    const command = `xcrun simctl openurl ${this.serial} "${location}"`;
    exec(command);
  }

  startLogging() {
    this.startLogListener(this.iOSBridge);
  }

  stopLogging() {
    this.log?.kill();
  }

  startLogListener(iOSBridge: IOSBridge, retries: number = 3) {
    if (retries === 0) {
      console.warn('Attaching iOS log listener continuously failed.');
      return;
    }

    const logListener = iOSBridge.startLogListener;
    if (
      !this.log &&
      logListener &&
      (this.deviceType === 'emulator' ||
        (this.deviceType === 'physical' && iOSBridge.idbAvailable))
    ) {
      this.log = logListener(this.serial, this.deviceType);
      this.log.on('error', (err: Error) => {
        console.error('iOS log tailer error', err);
      });

      this.log.stderr.on('data', (data: Buffer) => {
        console.warn('iOS log tailer stderr: ', data.toString());
      });

      this.log.on('exit', () => {
        this.log = undefined;
      });

      try {
        if (this.deviceType === 'physical') {
          this.log.stdout.pipe(split2('\0')).on('data', (line: string) => {
            const parsed = IOSDevice.parseLogLine(line);
            if (parsed) {
              this.addLogEntry(parsed);
            } else {
              console.warn('Failed to parse iOS log line: ', line);
            }
          });
        } else {
          this.log.stdout
            .pipe(new StripLogPrefix())
            .pipe(JSONStream.parse('*'))
            .on('data', (data: RawLogEntry) => {
              const entry = IOSDevice.parseJsonLogEntry(data);
              this.addLogEntry(entry);
            });
        }
      } catch (e) {
        console.error('Could not parse iOS log stream.', e);
        // restart log stream
        this.log.kill();
        this.log = undefined;
        this.startLogListener(iOSBridge, retries - 1);
      }
    }
  }

  static getLogLevel(level: string): LogLevel {
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
        type: IOSDevice.getLogLevel(matches[5]),
        message: matches[6],
      };
    }
    return undefined;
  }

  static parseJsonLogEntry(entry: RawLogEntry): DeviceLogEntry {
    let type: LogLevel = IOSDevice.getLogLevel(entry.messageType);

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

  async screenCaptureAvailable() {
    return this.deviceType === 'emulator' && this.connected.get();
  }

  async startScreenCapture(destination: string) {
    this.recordingProcess = exec(
      `xcrun simctl io ${this.serial} recordVideo --codec=h264 --force ${destination}`,
    );
    this.recordingLocation = destination;
  }

  async stopScreenCapture(): Promise<string | null> {
    if (this.recordingProcess && this.recordingLocation) {
      const prom = new Promise<void>((resolve, _reject) => {
        this.recordingProcess!.on(
          'exit',
          async (_code: number | null, _signal: NodeJS.Signals | null) => {
            resolve();
          },
        );
        this.recordingProcess!.kill('SIGINT');
      });

      const output: string | null = await promiseTimeout<void>(
        5000,
        prom,
        'Timed out to stop a screen capture.',
      )
        .then(() => {
          const {recordingLocation} = this;
          this.recordingLocation = undefined;
          return recordingLocation!;
        })
        .catch((_e) => {
          this.recordingLocation = undefined;
          console.error(_e);
          return null;
        });
      return output;
    }
    return null;
  }

  disconnect() {
    this.stopScreenCapture();
    super.disconnect();
  }
}

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
