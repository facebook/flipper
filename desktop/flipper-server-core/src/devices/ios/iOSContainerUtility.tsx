/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Mutex} from 'async-mutex';
import {exec as unsafeExec, Output} from 'promisify-child-process';
import {reportPlatformFailures} from 'flipper-common';
import {promises, constants} from 'fs';
import memoize from 'lodash.memoize';
import {notNull} from '../../utils/typeUtils';
import {promisify} from 'util';
import child_process from 'child_process';
import fs from 'fs-extra';
import path from 'path';
const exec = promisify(child_process.exec);

export type IdbConfig = {
  idbPath: string;
  enablePhysicalIOS: boolean;
};

// Use debug to get helpful logs when idb fails
const idbLogLevel = 'DEBUG';
const operationPrefix = 'iosContainerUtility';

const mutex = new Mutex();

type IdbTarget = {
  name: string;
  udid: string;
  state: 'Booted' | 'Shutdown';
  type: string | DeviceType;
  target_type?: string | DeviceType;
  os_version: string;
  architecture: string;
};

export type DeviceType = 'physical' | 'emulator';

export type DeviceTarget = {
  udid: string;
  type: DeviceType;
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
      .then(({stdout}) => parseIdbTargets(stdout!.toString()))
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

function parseIdbTargets(lines: string): Array<DeviceTarget> {
  const parsedIdbTargets = lines
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(({state}: IdbTarget) => state.toLocaleLowerCase() === 'booted')
    .map<IdbTarget>(({type, target_type, ...rest}: IdbTarget) => ({
      type: (type || target_type) === 'simulator' ? 'emulator' : 'physical',
      ...rest,
    }))
    .map<DeviceTarget>((target: IdbTarget) => ({
      udid: target.udid,
      type: target.type as DeviceType,
      name: target.name,
    }));

  // For some reason, idb can return duplicates
  // TODO: Raise the issue with idb
  const dedupedIdbTargets: Record<string, DeviceTarget> = {};
  for (const idbTarget of parsedIdbTargets) {
    dedupedIdbTargets[idbTarget.udid] =
      dedupedIdbTargets[idbTarget.udid] ?? idbTarget;
  }
  return Object.values(dedupedIdbTargets);
}

export async function idbListTargets(
  idbPath: string,
  safeExecFunc: (
    command: string,
  ) => Promise<{stdout: string; stderr: string} | Output> = safeExec,
): Promise<Array<DeviceTarget>> {
  return safeExecFunc(`${idbPath} list-targets --json`)
    .then(({stdout}) =>
      // See above.
      parseIdbTargets(stdout!.toString()),
    )
    .catch((e: Error) => {
      console.warn('Failed to query idb for targets:', e);
      return [];
    });
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
  // But idb is MUCH more CPU efficient than xcrun, so
  // when installed, use it. This still holds true
  // with the move from instruments to xcrun.
  // TODO: Move idb availability check up.
  if (await memoize(isAvailable)(idbPath)) {
    return await idbListTargets(idbPath);
  } else {
    return safeExec('xcrun xctrace list devices')
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
        console.warn('Failed to query for devices using xctrace:', e);
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

  return reportPlatformFailures(
    safeExec(
      `${idbPath} file push --log ${idbLogLevel} --udid ${udid} --bundle-id ${bundleId} '${src}' '${dst}'`,
    )
      .then(() => {
        return;
      })
      .catch((e) => handleMissingIdb(e, idbPath)),
    `${operationPrefix}:push`,
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

  return reportPlatformFailures(
    safeExec(
      `${idbPath} file pull --log ${idbLogLevel} --udid ${udid} --bundle-id ${bundleId} '${src}' '${dst}'`,
    )
      .then(() => {
        return;
      })
      .catch((e) => handleMissingIdb(e, idbPath))
      .catch((e) => handleMissingPermissions(e)),
    `${operationPrefix}:pull`,
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
    throw new Error(
      `idb doesn't appear to be installed. Run "${idbPath} list-targets" to fix this.`,
    );
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
    throw new Error(
      'Cannot connect to iOS application. idb_certificate_pull_failed' +
        'Idb lacks permissions to exchange certificates. Did you install a source build ([FB] or enable certificate exchange)? See console logs for more details.',
    );
  }
  throw e;
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
