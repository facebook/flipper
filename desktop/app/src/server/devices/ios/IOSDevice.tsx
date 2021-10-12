/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DeviceLogLevel,
  DeviceLogEntry,
  DeviceType,
  timeout,
} from 'flipper-common';
import child_process, {ChildProcess} from 'child_process';
import JSONStream from 'JSONStream';
import {Transform} from 'stream';
import {ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB, IOSBridge} from './IOSBridge';
import split2 from 'split2';
import {ServerDevice} from '../ServerDevice';
import {FlipperServerImpl} from '../../FlipperServerImpl';

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

export default class IOSDevice extends ServerDevice {
  log?: child_process.ChildProcessWithoutNullStreams;
  buffer: string;
  private recordingProcess?: ChildProcess;
  private recordingLocation?: string;
  private iOSBridge: IOSBridge;

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
    });
    this.buffer = '';
    this.iOSBridge = iOSBridge;
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

    if (!this.log) {
      try {
        this.log = iOSBridge.startLogListener(
          this.serial,
          this.info.deviceType,
        );
      } catch (e) {
        if (e.message === ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB) {
          console.warn(e);
        } else {
          console.error('Failed to initialise device logs:', e);
          this.startLogListener(iOSBridge, retries - 1);
        }
        return;
      }
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
        if (this.info.deviceType === 'physical') {
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
        type: IOSDevice.getLogLevel(matches[5]),
        message: matches[6],
      };
    }
    return undefined;
  }

  static parseJsonLogEntry(entry: RawLogEntry): DeviceLogEntry {
    let type: DeviceLogLevel = IOSDevice.getLogLevel(entry.messageType);

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
    return this.info.deviceType === 'emulator' && this.connected;
  }

  async startScreenCapture(destination: string) {
    this.recordingProcess = this.iOSBridge.recordVideo(
      this.serial,
      destination,
    );
    this.recordingLocation = destination;
  }

  async stopScreenCapture(): Promise<string> {
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

      const output: string = await timeout<void>(
        5000,
        prom,
        'Timed out to stop a screen capture.',
      )
        .then(() => {
          const {recordingLocation} = this;
          this.recordingLocation = undefined;
          return recordingLocation!;
        })
        .catch((e) => {
          this.recordingLocation = undefined;
          console.warn('Failed to terminate iOS screen recording:', e);
          throw e;
        });
      return output;
    }
    throw new Error('No recording in progress');
  }

  disconnect() {
    if (this.recordingProcess && this.recordingLocation) {
      this.stopScreenCapture();
    }
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
