/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Entry, Priority} from 'adbkit-logcat';
import type {CrashLog} from 'flipper-common';
import AndroidDevice from './AndroidDevice';

export function parseAndroidCrash(content: string, logDate?: Date) {
  const regForName = /.*\n/;
  const nameRegArr = regForName.exec(content);
  let name = nameRegArr ? nameRegArr[0] : 'Unknown';
  const regForCallStack = /\tat[\w\s\n\.$&+,:;=?@#|'<>.^*()%!-]*$/;
  const callStackArray = regForCallStack.exec(content);
  const callStack = callStackArray ? callStackArray[0] : '';
  let remainingString =
    callStack.length > 0 ? content.replace(callStack, '') : '';
  if (remainingString[remainingString.length - 1] === '\n') {
    remainingString = remainingString.slice(0, -1);
  }
  const reasonText =
    remainingString.length > 0 ? remainingString.split('\n').pop() : 'Unknown';
  const reason = reasonText ? reasonText : 'Unknown';
  if (name[name.length - 1] === '\n') {
    name = name.slice(0, -1);
  }
  const crash: CrashLog = {
    callstack: content,
    name: name,
    reason: reason,
    date: logDate?.getTime(),
  };
  return crash;
}

export function shouldParseAndroidLog(entry: Entry, date: Date): boolean {
  return (
    entry.date.getTime() - date.getTime() > 0 && // The log should have arrived after the device has been registered
    ((entry.priority === Priority.ERROR && entry.tag === 'AndroidRuntime') ||
      entry.priority === Priority.FATAL)
  );
}

/**
 * Starts listening ADB logs. Emits 'device-crash' on "error" and "fatal" entries.
 * Listens to the logs in a separate stream.
 * We can't leverage teh existing log listener mechanism (see `startLogging`)
 * it is started externally (by the client). Refactoring how we start log listeners is a bit too much.
 * It is easier to start its own stream for crash watcher and manage it independently.
 */
export function startAndroidCrashWatcher(device: AndroidDevice) {
  const referenceDate = new Date();
  let androidLog: string = '';
  let androidLogUnderProcess = false;
  let timer: null | NodeJS.Timeout = null;
  let gracefulShutdown = false;
  const readerPromise = device.adb
    .openLogcat(device.serial, {clear: true})
    .then((reader) =>
      reader
        .on('entry', (entry) => {
          if (shouldParseAndroidLog(entry, referenceDate)) {
            if (androidLogUnderProcess) {
              androidLog += '\n' + entry.message;
              androidLog = androidLog.trim();
              if (timer) {
                clearTimeout(timer);
              }
            } else {
              androidLog = entry.message;
              androidLogUnderProcess = true;
            }
            timer = setTimeout(() => {
              if (androidLog.length > 0) {
                device.flipperServer.emit('device-crash', {
                  crash: parseAndroidCrash(androidLog, entry.date),
                  serial: device.info.serial,
                });
              }
              androidLogUnderProcess = false;
              androidLog = '';
            }, 50);
          }
        })
        .on('end', () => {
          if (!gracefulShutdown) {
            // logs didn't stop gracefully
            setTimeout(() => {
              if (device.connected) {
                console.warn(
                  `Log stream broken: ${device.serial} - restarting`,
                );
                device.startCrashWatcher();
              }
            }, 100);
          }
        })
        .on('error', (e) => {
          console.warn('Failed to read from adb logcat: ', e);
        }),
    )
    .catch((e) => {
      console.warn('Failed to open log stream: ', e);
    });

  return () => {
    gracefulShutdown = true;
    readerPromise
      .then((reader) => reader?.end())
      .catch((e) => {
        console.error('Failed to close adb logcat stream: ', e);
      });
  };
}
