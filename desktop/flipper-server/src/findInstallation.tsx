/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServerImpl} from 'flipper-server-core';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

export async function findInstallation(
  server: FlipperServerImpl,
): Promise<string | undefined> {
  if (server.config.environmentInfo.os.platform !== 'darwin') {
    return;
  }

  const appPath = path.join(
    os.homedir(),
    'Applications',
    'Chrome Apps.localized',
    'Flipper.app',
  );
  const appPlistPath = path.join(appPath, 'Contents', 'Info.plist');
  if (await fs.pathExists(appPlistPath)) {
    return appPath;
  }
}
