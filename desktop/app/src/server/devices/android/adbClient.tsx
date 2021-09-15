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
  return reportPlatformFailures<Client>(
    execFile(adbPath, ['start-server']).then(() =>
      adbkit.createClient(adbConfig()),
    ),
    'createADBClient.shell',
  );
}
