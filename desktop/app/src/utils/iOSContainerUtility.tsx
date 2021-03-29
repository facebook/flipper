/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Mutex} from 'async-mutex';
import {exec as unsafeExec, Output} from 'promisify-child-process';
import {killOrphanedInstrumentsProcesses} from './processCleanup';
import {reportPlatformFailures} from './metrics';
import {promises, constants} from 'fs';
import memoize from 'lodash.memoize';
import {notNull} from './typeUtils';
import {promisify} from 'util';
import child_process from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import fbConfig from '../fb-stubs/config';
import {notification, Typography} from 'antd';
const exec = promisify(child_process.exec);

// Use debug to get helpful logs when idb fails
const idbLogLevel = 'DEBUG';
const operationPrefix = 'iosContainerUtility';

const mutex = new Mutex();

type IdbTarget = {
  name: string;
  udid: string;
  state: string;
  type: string;
  os_version: string;
  architecture: string;
};

export type DeviceTarget = {
  udid: string;
  type: 'physical' | 'emulator';
  name: string;
};

function isAvailable(idbPath: string): Promise<boolean> {
  if (!idbPath) {
    return Promise.resolve(false);
  }
  return promises
    .access(idbPath, constants.X_OK)
    .then((_) => true)
    .catch((_) => false);
}

function safeExec(
  command: string,
): Promise<{stdout: string; stderr: string} | Output> {
  return mutex
    .acquire()
    .then((release) => unsafeExec(command).finally(release));
}

export async function queryTargetsWithoutXcodeDependency(
  idbCompanionPath: string,
  isPhysicalDeviceEnabled: boolean,
  isAvailableFunc: (idbPath: string) => Promise<boolean>,
  safeExecFunc: (
    command: string,
  ) => Promise<{stdout: string; stderr: string} | Output>,
): Promise<Array<DeviceTarget>> {
  if (await isAvailableFunc(idbCompanionPath)) {
    return safeExecFunc(`${idbCompanionPath} --list 1 --only device`)
      .then(({stdout}) =>
        // It is safe to assume this to be non-null as it only turns null
        // if the output redirection is misconfigured:
        // https://stackoverflow.com/questions/27786228/node-child-process-spawn-stdout-returning-as-null
        stdout!
          .toString()
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .filter(({type}: IdbTarget) => type !== 'simulator')
          .map<DeviceTarget>((target: IdbTarget) => {
            return {udid: target.udid, type: 'physical', name: target.name};
          }),
      )
      .then((devices) => {
        if (devices.length > 0 && !isPhysicalDeviceEnabled) {
          // TODO: Show a notification to enable the toggle or integrate Doctor to better suggest this advice.
          console.warn(
            'You are trying to connect Physical Device. Please enable the toggle "Enable physical iOS device" from the setting screen.',
          );
        }
        return devices;
      })
      .catch((e: Error) => {
        console.warn(
          'Failed to query idb_companion --list 1 --only device for physical targets:',
          e,
        );
        return [];
      });
  } else {
    console.warn(
      `Unable to locate idb_companion in ${idbCompanionPath}. Try running sudo yum install -y fb-idb`,
    );
    return [];
  }
}

async function targets(
  idbPath: string,
  isPhysicalDeviceEnabled: boolean,
): Promise<Array<DeviceTarget>> {
  if (process.platform !== 'darwin') {
    return [];
  }
  const isXcodeInstalled = await isXcodeDetected();
  if (!isXcodeInstalled) {
    if (!isPhysicalDeviceEnabled) {
      // TODO: Show a notification to enable the toggle or integrate Doctor to better suggest this advice.
      console.warn(
        'You are trying to connect Physical Device. Please enable the toggle "Enable physical iOS device" from the setting screen.',
      );
    }
    const idbCompanionPath = path.dirname(idbPath) + '/idb_companion';
    return queryTargetsWithoutXcodeDependency(
      idbCompanionPath,
      isPhysicalDeviceEnabled,
      isAvailable,
      safeExec,
    );
  }

  // Not all users have idb installed because you can still use
  // Flipper with Simulators without it.
  // But idb is MUCH more CPU efficient than instruments, so
  // when installed, use it.
  if (await memoize(isAvailable)(idbPath)) {
    return safeExec(`${idbPath} list-targets --json`)
      .then(({stdout}) =>
        // It is safe to assume this to be non-null as it only turns null
        // if the output redirection is misconfigured:
        // https://stackoverflow.com/questions/27786228/node-child-process-spawn-stdout-returning-as-null
        stdout!
          .toString()
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .filter(({type}: IdbTarget) => type !== 'simulator')
          .map<DeviceTarget>((target: IdbTarget) => {
            return {udid: target.udid, type: 'physical', name: target.name};
          }),
      )
      .catch((e: Error) => {
        console.warn('Failed to query idb for targets:', e);
        return [];
      });
  } else {
    await killOrphanedInstrumentsProcesses();
    return safeExec('instruments -s devices')
      .then(({stdout}) =>
        stdout!
          .toString()
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => /(.+) \([^(]+\) \[(.*)\]( \(Simulator\))?/.exec(line))
          .filter(notNull)
          .filter(([_match, _name, _udid, isSim]) => !isSim)
          .map<DeviceTarget>(([_match, name, udid]) => {
            return {udid, type: 'physical', name};
          }),
      )
      .catch((e) => {
        console.warn('Failed to query instruments:', e);
        return [];
      });
  }
}

async function push(
  udid: string,
  src: string,
  bundleId: string,
  dst: string,
  idbPath: string,
): Promise<void> {
  await memoize(checkIdbIsInstalled)(idbPath);
  return wrapWithErrorMessage(
    reportPlatformFailures(
      safeExec(
        `${idbPath} --log ${idbLogLevel} file push --udid ${udid} --bundle-id ${bundleId} '${src}' '${dst}'`,
      )
        .then(() => {
          return;
        })
        .catch((e) => handleMissingIdb(e, idbPath)),
      `${operationPrefix}:push`,
    ),
  );
}

async function pull(
  udid: string,
  src: string,
  bundleId: string,
  dst: string,
  idbPath: string,
): Promise<void> {
  await memoize(checkIdbIsInstalled)(idbPath);
  return wrapWithErrorMessage(
    reportPlatformFailures(
      safeExec(
        `${idbPath} --log ${idbLogLevel} file pull --udid ${udid} --bundle-id ${bundleId} '${src}' '${dst}'`,
      )
        .then(() => {
          return;
        })
        .catch((e) => handleMissingIdb(e, idbPath))
        .catch((e) => handleMissingPermissions(e)),
      `${operationPrefix}:pull`,
    ),
  );
}

export async function checkIdbIsInstalled(idbPath: string): Promise<void> {
  const isInstalled = await isAvailable(idbPath);
  if (!isInstalled) {
    throw new Error(
      `idb is required to use iOS devices. Install it with instructions from https://github.com/facebook/idb and set the installation path in Flipper settings.`,
    );
  }
}

// The fb-internal idb binary is a shim that downloads the proper one on first run. It requires sudo to do so.
// If we detect this, Tell the user how to fix it.
function handleMissingIdb(e: Error, idbPath: string): void {
  if (
    e.message &&
    e.message.includes('sudo: no tty present and no askpass program specified')
  ) {
    console.warn(e);
    const message = `idb doesn't appear to be installed. Run "${idbPath} list-targets" to fix this.`;
    notification.error({
      message: 'Cannot connect to idb',
      duration: null,
      description: message,
      key: 'idb_connection_failed',
    });
    return;
  }
  throw e;
}

function handleMissingPermissions(e: Error): void {
  if (
    e.message &&
    e.message.includes('Command failed') &&
    e.message.includes('file pull') &&
    e.message.includes('sonar/app.csr')
  ) {
    console.warn(e);
    const message = fbConfig.isFBBuild ? (
      <>
        Idb lacks permissions to exchange certificates. Did you install a source
        build or a debug build with certificate exchange enabled?{' '}
        <Typography.Link href="https://www.internalfb.com/intern/staticdocs/flipper/docs/getting-started/fb/connecting-to-flipper#app-on-physical-ios-device">
          How To
        </Typography.Link>
      </>
    ) : (
      'Idb lacks permissions to exchange certificates. Did you install a source build?'
    );
    notification.error({
      message: 'Cannot connect to iOS application',
      duration: null,
      description: message,
      key: 'idb_certificate_pull_failed',
    });
    return;
  }
  throw e;
}

function wrapWithErrorMessage<T>(p: Promise<T>): Promise<T> {
  return p.catch((e: Error) => {
    console.warn(e);
    // Give the user instructions. Don't embed the error because it's unique per invocation so won't be deduped.
    throw new Error(
      "A problem with idb has ocurred. Please run `sudo rm -rf /tmp/idb*` and `sudo yum install -y fb-idb` to update it, if that doesn't fix it, post in Flipper Support.",
    );
  });
}

async function isXcodeDetected(): Promise<boolean> {
  return exec('xcode-select -p')
    .then(({stdout}) => {
      return fs.pathExists(stdout.trim());
    })
    .catch((_) => false);
}

export default {
  isAvailable,
  targets,
  push,
  pull,
  isXcodeDetected,
};
