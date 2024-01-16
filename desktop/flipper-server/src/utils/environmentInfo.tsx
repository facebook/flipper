/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import process from 'process';
import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import {EnvironmentInfo, ReleaseChannel} from 'flipper-common';

export async function getEnvironmentInfo(
  packageJsonDir: string,
  isProduction: boolean,
): Promise<EnvironmentInfo> {
  const packageJson = await fs.readJSON(
    path.resolve(packageJsonDir, 'package.json'),
  );

  const releaseChannel: ReleaseChannel =
    process.env.FLIPPER_RELEASE_CHANNEL === 'insiders'
      ? ReleaseChannel.INSIDERS
      : process.env.FLIPPER_RELEASE_CHANNEL === 'stable'
        ? ReleaseChannel.STABLE
        : packageJson.releaseChannel === 'insiders'
          ? ReleaseChannel.INSIDERS
          : ReleaseChannel.STABLE;

  // This is provided as part of the bundling process for headless.
  const flipperReleaseRevision =
    (global as any).__REVISION__ ?? packageJson.revision;

  const appVersion =
    process.env.FLIPPER_FORCE_VERSION ??
    (isProduction ? packageJson.version : '0.0.0');

  if (packageJson.reactNativeOnly) {
    process.env.FLIPPER_REACT_NATIVE_ONLY = 'true';
  }

  return {
    processId: process.pid,
    isProduction,
    releaseChannel,
    flipperReleaseRevision,
    appVersion,
    os: {
      arch: process.arch,
      platform: process.platform,
      unixname: os.userInfo().username,
    },
    versions: {
      node: process.versions.node,
      platform: os.release(),
    },
  };
}
