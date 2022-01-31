/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {CrashLog} from 'flipper-common';
import {DeviceListener} from '../../utils/DeviceListener';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {ServerDevice} from '../ServerDevice';

export function parseIosCrash(content: string) {
  const regex = /Exception Type: *\w*/;
  const arr = regex.exec(content);
  const exceptionString = arr ? arr[0] : '';
  const exceptionRegex = /\w*$/;
  const tmp = exceptionRegex.exec(exceptionString);
  const exception = tmp && tmp[0].length ? tmp[0] : 'Unknown';

  const dateRegex = /Date\/Time: *[\w\s\.:-]*/;
  const dateArr = dateRegex.exec(content);
  const dateString = dateArr ? dateArr[0] : '';
  const dateRegex2 = /[\w\s\.:-]*$/;
  const tmp1 = dateRegex2.exec(dateString);
  const extractedDateString: string | null =
    tmp1 && tmp1[0].length ? tmp1[0] : null;
  const date = extractedDateString
    ? new Date(extractedDateString).getTime()
    : Date.now();

  const crash: CrashLog = {
    callstack: content,
    name: exception,
    reason: exception,
    date,
  };
  return crash;
}

export function shouldShowiOSCrashNotification(
  serial: string,
  content: string,
): boolean {
  const appPath = parsePath(content);
  if (!appPath || !appPath.includes(serial)) {
    // Do not show notifications for the app which are not running on this device
    return false;
  }
  return true;
}

export function parsePath(content: string): string | null {
  const regex = /(?<=.*Path: *)[^\n]*/;
  const arr = regex.exec(content);
  if (!arr || arr.length <= 0) {
    return null;
  }
  const path = arr[0];
  return path.trim();
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export class iOSCrashWatcher extends DeviceListener {
  constructor(private readonly device: ServerDevice) {
    super(() => device.connected);
  }
  protected async startListener() {
    const dir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');

    if (!(await fs.pathExists(dir))) {
      throw new Error('Failed to start iOS crash watcher: path does not exist');
    }

    const watcher = fs.watch(dir, async (_eventType, filename) => {
      // We just parse the crash logs with extension `.crash`
      // TODO: Make it work on MacOS 12. ASAP!
      // MacOS 12 does not create .crash reports, but uses new .ips files instead with different format.
      const checkFileExtension = /.crash$/.exec(filename);
      if (!filename || !checkFileExtension) {
        return;
      }
      const filepath = path.join(dir, filename);
      const exists = await fs.pathExists(filepath);
      if (!exists) {
        return;
      }
      fs.readFile(filepath, 'utf8', (err, data) => {
        if (err) {
          console.warn('Failed to read crash file', err);
          return;
        }
        if (shouldShowiOSCrashNotification(this.device.serial, data)) {
          this.device.flipperServer.emit('device-crash', {
            crash: parseIosCrash(data),
            serial: this.device.serial,
          });
        }
      });
    });

    watcher.on('error', (e) => {
      console.error('iOS crash watcher error', e);
    });

    return () => watcher.close();
  }
}
