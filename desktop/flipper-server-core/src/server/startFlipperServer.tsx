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
  EnvironmentInfo,
} from 'flipper-common';
import path from 'path';
import fs from 'fs-extra';
import {KeytarModule} from '../utils/keytar';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {getGatekeepers} from '../gk';
import {loadLauncherSettings} from '../utils/launcherSettings';
import {loadProcessConfig} from '../utils/processConfig';
import {loadSettings} from '../utils/settings';

/**
 * Creates an instance of FlipperServer (FlipperServerImpl). This is the
 * server used by clients to connect to.
 * @param rootPath Application path.
 * @param staticPath Static assets path.
 * @param settingsString Optional settings used to override defaults.
 * @param enableLauncherSettings Optional launcher settings used to override defaults.
 * @returns
 */
export async function startFlipperServer(
  rootPath: string,
  staticPath: string,
  settingsString: string,
  enableLauncherSettings: boolean,
  keytarModule: KeytarModule,
  type: FlipperServerType,
  environmentInfo: EnvironmentInfo,
): Promise<FlipperServerImpl> {
  const execPath = process.execPath;
  const appPath = rootPath;
  const env = process.env;
  let desktopPath = path.resolve(os.homedir(), 'Desktop');

  // eslint-disable-next-line node/no-sync
  if (!fs.existsSync(desktopPath)) {
    console.warn('Failed to find desktop path, falling back to homedir');
    desktopPath = os.homedir();
  }
  return new FlipperServerImpl(
    {
      environmentInfo,
      env: parseEnvironmentVariables(process.env),
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
