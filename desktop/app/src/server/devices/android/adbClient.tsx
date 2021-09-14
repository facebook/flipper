/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {reportPlatformFailures} from '../../../utils/metrics';
import {execFile} from 'promisify-child-process';
import promiseRetry from 'promise-retry';
import adbConfig from './adbConfig';
import adbkit, {Client} from 'adbkit';
import path from 'path';

const MAX_RETRIES = 5;
let instance: Promise<Client>;

type Config = {
  androidHome: string;
};

export function getAdbClient(config: Config): Promise<Client> {
  if (!instance) {
    instance = reportPlatformFailures(createClient(config), 'createADBClient');
  }
  return instance;
}

/* Adbkit will attempt to start the adb server if it's not already running,
   however, it sometimes fails with ENOENT errors. So instead, we start it
   manually before requesting a client. */
async function createClient(config: Config): Promise<Client> {
  const androidHome = config.androidHome;
  const adbPath = path.resolve(androidHome, 'platform-tools/adb');
  try {
    return reportPlatformFailures<Client>(
      execFile(adbPath, ['start-server']).then(() =>
        adbkit.createClient(adbConfig()),
      ),
      'createADBClient.shell',
    );
  } catch (err) {
    console.log(
      'Failed to create adb client using shell adb command. Trying with adbkit.\n' +
        err.toString(),
    );

    /* In the event that starting adb with the above method fails, fallback
         to using adbkit, though its known to be unreliable. */
    const unsafeClient: Client = adbkit.createClient(adbConfig());
    return await reportPlatformFailures<Client>(
      promiseRetry<Client>(
        async (retry, attempt): Promise<Client> => {
          try {
            await unsafeClient.listDevices();
            return unsafeClient;
          } catch (e) {
            console.warn(`Failed to start adb client. Retrying. ${e.message}`);
            if (attempt <= MAX_RETRIES) {
              retry(e);
            }
            throw e;
          }
        },
        {
          minTimeout: 200,
          retries: MAX_RETRIES,
        },
      ),
      'createADBClient.adbkit',
    );
  }
}
