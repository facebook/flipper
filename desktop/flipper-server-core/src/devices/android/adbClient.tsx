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
import adbkit, {Client as ADBClient} from '@u4/adbkit';
import path from 'path';

type Config = {
  androidHome: string;
  adbKitSettings?: {
    host?: string;
    port?: number;
  };
};

export async function initializeAdbClient(
  config: Config,
): Promise<ADBClient | void> {
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
async function createClient(config: Config): Promise<ADBClient> {
  return reportPlatformFailures<ADBClient>(
    startAdbServer(config.androidHome).then(() =>
      adbkit.createClient(config.adbKitSettings),
    ),
    'createADBClient.shell',
  );
}

async function startAdbServer(androidHome: string) {
  const adbPath = path.resolve(androidHome, 'platform-tools', 'adb');
  const args = ['start-server'];

  return execFile(adbPath, args).catch((error) => {
    if (error.code == 'ENOENT') {
      console.info('falling back to the alternative adb path');
      return execFile(path.resolve(androidHome, 'adb'), args);
    }

    throw error;
  });
}
