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
  parseEnvironmentVariables,
  getLogger,
  FlipperServerType,
} from 'flipper-common';
import path from 'path';
import fs from 'fs-extra';
import {KeytarModule} from '../utils/keytar';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {getEnvironmentInfo} from '../utils/environmentInfo';
import {getGatekeepers} from '../gk';
import {loadLauncherSettings} from '../utils/launcherSettings';
import {loadProcessConfig} from '../utils/processConfig';
import {loadSettings} from '../utils/settings';

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
  keytarModule: KeytarModule,
  type: FlipperServerType,
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
      type,
    },
    getLogger(),
    keytarModule,
  );
}
