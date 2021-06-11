/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {reportPlatformFailures} from './metrics';
import {execFile} from 'promisify-child-process';
import promiseRetry from 'promise-retry';
import adbConfig from '../utils/adbConfig';
import adbkit, {Client} from 'adbkit';
import {Store} from '../reducers/index';
import path from 'path';

const MAX_RETRIES = 5;
let instance: Promise<Client>;

export function getAdbClient(store: Store): Promise<Client> {
  if (!instance) {
    instance = reportPlatformFailures(createClient(store), 'createADBClient');
  }
  return instance;
}

/* Adbkit will attempt to start the adb server if it's not already running,
   however, it sometimes fails with ENOENT errors. So instead, we start it
   manually before requesting a client. */
function createClient(store: Store): Promise<Client> {
  const androidHome = store.getState().settingsState.androidHome;
  const adbPath = path.resolve(androidHome, 'platform-tools/adb');
  return reportPlatformFailures<Client>(
    execFile(adbPath, ['start-server']).then(() =>
      adbkit.createClient(adbConfig()),
    ),
    'createADBClient.shell',
  ).catch((err) => {
    console.log(
      'Failed to create adb client using shell adb command. Trying with adbkit.\n' +
        err.toString(),
    );

    /* In the event that starting adb with the above method fails, fallback
         to using adbkit, though its known to be unreliable. */
    const unsafeClient: Client = adbkit.createClient(adbConfig());
    return reportPlatformFailures<Client>(
      promiseRetry<Client>(
        (retry, attempt): Promise<Client> => {
          return unsafeClient
            .listDevices()
            .then(() => {
              return unsafeClient;
            })
            .catch((e: Error) => {
              console.warn(
                `Failed to start adb client. Retrying. ${e.message}`,
              );
              if (attempt <= MAX_RETRIES) {
                retry(e);
              }
              throw e;
            });
        },
        {
          minTimeout: 200,
          retries: MAX_RETRIES,
        },
      ),
      'createADBClient.adbkit',
    );
  });
}
