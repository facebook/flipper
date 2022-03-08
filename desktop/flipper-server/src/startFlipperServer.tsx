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
import {
  parseEnvironmentVariables,
  isTest,
  Logger,
  setLoggerInstance,
} from 'flipper-common';
import path from 'path';
import fs from 'fs-extra';

export async function startFlipperServer(
  rootDir: string,
  staticPath: string,
  settingsString: string,
  enableLauncherSettings: boolean,
): Promise<FlipperServerImpl> {
  if (os.platform() === 'darwin') {
    // By default Node.JS has its internal certificate storage and doesn't use
    // the system store. Because of this, it's impossible to access ondemand / devserver
    // which are signed using some internal self-issued FB certificates. These certificates
    // are automatically installed to MacOS system store on FB machines, so here we're using
    // this "mac-ca" library to load them into Node.JS.
    electronRequire('mac-ca');
  }

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

  const logger = createLogger();
  setLoggerInstance(logger);

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

  const environmentInfo = await getEnvironmentInfo(appPath, isProduction);

  return new FlipperServerImpl(
    {
      environmentInfo,
      env: parseEnvironmentVariables(process.env),
      // TODO: make userame parameterizable
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
    logger,
    keytar,
  );
}

function createLogger(): Logger {
  return {
    track(..._args: [any, any, any?, any?]) {
      // TODO: only if verbose console.debug(...args);
      // console.warn('(skipper track)', args);
    },
    trackTimeSince(..._args: [any, any, any?]) {
      // TODO: only if verbose console.debug(...args);
      // console.warn('(skipped trackTimeSince)', args);
    },
    debug(..._args: any[]) {
      // TODO: only if double verbose console.debug(...args);
    },
    error(...args: any[]) {
      console.error(...args);
      console.warn('(skipped error reporting)');
    },
    warn(...args: any[]) {
      console.warn(...args);
      console.warn('(skipped error reporting)');
    },
    info(..._args: any[]) {
      // TODO: only if  verbose console.debug(...args);
      // console.info(...args);
    },
  };
}
