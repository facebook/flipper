/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {reportPlatformFailures} from 'flipper-common';
import {execFile} from 'promisify-child-process';
import adbConfig from './adbConfig';
import adbkit, {Client} from 'adbkit';
import path from 'path';
import {pathExists} from 'fs-extra';

type Config = {
  androidHome: string;
};

export async function initializeAdbClient(
  config: Config,
): Promise<Client | void> {
  const adbClient = await reportPlatformFailures(
    createClient(config),
    'createADBClient',
  ).catch((e) => {
    console.warn(
      'Failed to initialize ADB. Please disable Android support in settings, or configure a correct path.',
      e,
    );
  });
  return adbClient;
}

/* Adbkit will attempt to start the adb server if it's not already running,
   however, it sometimes fails with ENOENT errors. So instead, we start it
   manually before requesting a client. */
async function createClient(config: Config): Promise<Client> {
  const androidHome = config.androidHome;
  let adbPath = path.resolve(androidHome, 'platform-tools', 'adb');
  if (!(await pathExists(adbPath))) {
    console.info('falling back to the alternative adb path');
    adbPath = path.resolve(androidHome, 'adb');
  }
  return reportPlatformFailures<Client>(
    execFile(adbPath, ['start-server']).then(() =>
      adbkit.createClient(adbConfig()),
    ),
    'createADBClient.shell',
  );
}
