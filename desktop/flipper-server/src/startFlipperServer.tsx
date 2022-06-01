/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import {
  FlipperServerImpl,
  getGatekeepers,
  loadLauncherSettings,
  loadProcessConfig,
  loadSettings,
  getEnvironmentInfo,
} from 'flipper-server-core';
import {parseEnvironmentVariables, isTest, getLogger} from 'flipper-common';
import path from 'path';
import fs from 'fs-extra';

/**
 * Creates an instance of FlipperServer (FlipperServerImpl). This is the
 * server used by clients to connect to.
 * @param rootDir Application path.
 * @param staticPath Static assets path.
 * @param settingsString Optional settings used to override defaults.
 * @param enableLauncherSettings Optional launcher settings used to override defaults.
 * @returns
 */
export async function startFlipperServer(
  rootDir: string,
  staticPath: string,
  settingsString: string,
  enableLauncherSettings: boolean,
): Promise<FlipperServerImpl> {
  const execPath = process.execPath;
  const appPath = rootDir;
  const isProduction =
    process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';
  const env = process.env;
  let desktopPath = path.resolve(os.homedir(), 'Desktop');

  // eslint-disable-next-line node/no-sync
  if (!fs.existsSync(desktopPath)) {
    console.warn('Failed to find desktop path, falling back to homedir');
    desktopPath = os.homedir();
  }

  let keytar: any = undefined;
  try {
    if (!isTest()) {
      const keytarPath = path.join(
        staticPath,
        'native-modules',
        `keytar-${process.platform}-${process.arch}.node`,
      );
      if (!(await fs.pathExists(keytarPath))) {
        throw new Error(
          `Keytar binary does not exist for platform ${process.platform}-${process.arch}`,
        );
      }
      keytar = electronRequire(keytarPath);
    }
  } catch (e) {
    console.error('Failed to load keytar:', e);
  }

  const environmentInfo = await getEnvironmentInfo(appPath, isProduction, true);

  return new FlipperServerImpl(
    {
      environmentInfo,
      env: parseEnvironmentVariables(process.env),
      // TODO: make username parameterizable
      gatekeepers: getGatekeepers(environmentInfo.os.unixname),
      paths: {
        appPath,
        homePath: os.homedir(),
        execPath,
        staticPath: staticPath,
        tempPath: os.tmpdir(),
        desktopPath: desktopPath,
      },
      launcherSettings: await loadLauncherSettings(enableLauncherSettings),
      processConfig: loadProcessConfig(env),
      settings: await loadSettings(settingsString),
      validWebSocketOrigins: ['localhost:', 'http://localhost:'],
    },
    getLogger(),
    keytar,
  );
}
