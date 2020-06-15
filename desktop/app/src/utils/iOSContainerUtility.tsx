/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import child_process from 'child_process';
import {promisify} from 'util';
import {Mutex} from 'async-mutex';
import {notNull} from './typeUtils';
const unsafeExec = promisify(child_process.exec);
import {killOrphanedInstrumentsProcesses} from './processCleanup';
import {reportPlatformFailures} from './metrics';
import {promises, constants} from 'fs';

// Use debug to get helpful logs when idb fails
const idbLogLevel = 'DEBUG';
const operationPrefix = 'iosContainerUtility';

const mutex = new Mutex();

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

function safeExec(command: string): Promise<{stdout: string; stderr: string}> {
  return mutex.acquire().then((release) => {
    return unsafeExec(command).finally(release);
  });
}

async function targets(): Promise<Array<DeviceTarget>> {
  if (process.platform !== 'darwin') {
    return [];
  }
  await killOrphanedInstrumentsProcesses();
  return safeExec('instruments -s devices').then(({stdout}) =>
    stdout
      .toString()
      .split('\n')
      .map((line) => line.trim())
      .map((line) => /(.+) \([^(]+\) \[(.*)\]( \(Simulator\))?/.exec(line))
      .filter(notNull)
      .filter(
        ([_match, name, _udid, isSim]) =>
          !isSim && (name.includes('iPhone') || name.includes('iPad')),
      )
      .map(([_match, name, udid]) => {
        return {udid: udid, type: 'physical', name: name};
      }),
  );
}

async function push(
  udid: string,
  src: string,
  bundleId: string,
  dst: string,
  idbPath: string,
): Promise<void> {
  await checkIdbIsInstalled(idbPath);
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
  await checkIdbIsInstalled(idbPath);
  return wrapWithErrorMessage(
    reportPlatformFailures(
      safeExec(
        `${idbPath} --log ${idbLogLevel} file pull --udid ${udid} --bundle-id ${bundleId} '${src}' '${dst}'`,
      )
        .then(() => {
          return;
        })
        .catch((e) => handleMissingIdb(e, idbPath)),
      `${operationPrefix}:pull`,
    ),
  );
}

async function checkIdbIsInstalled(idbPath: string): Promise<void> {
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
    throw new Error(
      `idb doesn't appear to be installed. Run "${idbPath} list-targets" to fix this.`,
    );
  }
  throw e;
}

function wrapWithErrorMessage<T>(p: Promise<T>): Promise<T> {
  return p.catch((e: Error) => {
    console.error(e);
    // Give the user instructions. Don't embed the error because it's unique per invocation so won't be deduped.
    throw new Error(
      "A problem with idb has ocurred. Please run `sudo rm -rf /tmp/idb*` and `sudo yum install -y fb-idb` to update it, if that doesn't fix it, post in Flipper Support.",
    );
  });
}

export default {
  isAvailable: isAvailable,
  targets: targets,
  push: push,
  pull: pull,
};
