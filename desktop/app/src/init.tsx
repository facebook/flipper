/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {enableMapSet} from 'immer';
import {
  _NuxManagerContext,
  _createNuxManager,
  _setGlobalInteractionReporter,
  _LoggerContext,
} from 'flipper-plugin';
// eslint-disable-next-line no-restricted-imports,flipper/no-electron-remote-imports
import {remote} from 'electron';
import os from 'os';
import {
  FlipperServerImpl,
  getEnvironmentInfo,
  getGatekeepers,
  loadLauncherSettings,
  loadProcessConfig,
  loadSettings,
  setupPrefetcher,
} from 'flipper-server-core';
import {
  getLogger,
  isTest,
  Logger,
  parseEnvironmentVariables,
  setLoggerInstance,
  Settings,
} from 'flipper-common';
import constants from './fb-stubs/constants';
import {initializeElectron} from './electron/initializeElectron';
import path from 'path';
import fs from 'fs-extra';

enableMapSet();

if (process.env.NODE_ENV === 'development' && os.platform() === 'darwin') {
  // By default Node.JS has its internal certificate storage and doesn't use
  // the system store. Because of this, it's impossible to access ondemand / devserver
  // which are signed using some internal self-issued FB certificates. These certificates
  // are automatically installed to MacOS system store on FB machines, so here we're using
  // this "mac-ca" library to load them into Node.JS.
  electronRequire('mac-ca');
}

async function start() {
  const app = remote.app;
  const execPath = process.execPath || remote.process.execPath;
  const appPath = app.getAppPath();
  const staticPath = getStaticDir();
  const isProduction = !/node_modules[\\/]electron[\\/]/.test(execPath);
  const env = process.env;
  const environmentInfo = await getEnvironmentInfo(staticPath, isProduction);
  const logger = createDelegatedLogger();
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

  const flipperServer = new FlipperServerImpl(
    {
      environmentInfo,
      env: parseEnvironmentVariables(env),
      // TODO: make userame parameterizable
      gatekeepers: getGatekeepers(environmentInfo.os.unixname),
      paths: {
        appPath,
        homePath: app.getPath('home'),
        execPath,
        staticPath,
        tempPath: app.getPath('temp'),
        desktopPath: app.getPath('desktop'),
      },
      launcherSettings: await loadLauncherSettings(),
      processConfig: loadProcessConfig(env),
      settings: await loadSettings(),
      validWebSocketOrigins: constants.VALID_WEB_SOCKET_REQUEST_ORIGIN_PREFIXES,
    },
    logger,
    keytar,
  );

  const flipperServerConfig = await flipperServer.exec('get-config');

  initializeElectron(flipperServer, flipperServerConfig);

  setProcessState(flipperServerConfig.settings);

  // By turning this in a require, we force the JS that the body of this module (init) has completed (initializeElectron),
  // before starting the rest of the Flipper process.
  // This prevent issues where the render host is referred at module initialisation level,
  // but not set yet, which might happen when using normal imports.
  // eslint-disable-next-line import/no-commonjs
  require('flipper-ui-core').startFlipperDesktop(flipperServer);

  await flipperServer.connect();

  // Initialize launcher
  setupPrefetcher(flipperServerConfig.settings);
}

start().catch((e) => {
  console.error('Failed to start Flipper desktop', e);
  document.getElementById('root')!.textContent =
    'Failed to start Flipper desktop: ' + e;
});

function getStaticDir() {
  let _staticPath = path.resolve(__dirname, '..', '..', 'static');
  // fs.existSync used here, as fs-extra doesn't resovle properly in the app.asar
  /* eslint-disable node/no-sync*/
  if (fs.existsSync(_staticPath)) {
    // True in unit tests
    return _staticPath;
  }
  if (remote && fs.existsSync(remote.app.getAppPath())) {
    _staticPath = path.join(remote.app.getAppPath());
  }
  if (!fs.existsSync(_staticPath)) {
    throw new Error('Static path does not exist: ' + _staticPath);
  }
  /* eslint-enable node/no-sync*/
  return _staticPath;
}

// getLogger() is not  yet created when the electron app starts.
// we can't create it here yet, as the real logger is wired up to
// the redux store and the rest of the world. So we create a delegating logger
// that uses a simple implementation until the real one comes available
function createDelegatedLogger(): Logger {
  const naiveLogger: Logger = {
    track(...args: [any, any, any?, any?]) {
      console.warn('(skipper track)', args);
    },
    trackTimeSince(...args: [any, any, any?]) {
      console.warn('(skipped trackTimeSince)', args);
    },
    debug(...args: any[]) {
      console.debug(...args);
    },
    error(...args: any[]) {
      console.error(...args);
      console.warn('(skipped error reporting)');
    },
    warn(...args: any[]) {
      console.warn(...args);
      console.warn('(skipped error reporting)');
    },
    info(...args: any[]) {
      console.info(...args);
    },
  };
  // will be overwrittingen later
  setLoggerInstance(naiveLogger);

  return {
    track() {
      // noop
    },
    trackTimeSince() {
      // noop
    },
    debug(...args: any[]) {
      getLogger().debug(...args);
    },
    error(...args: any[]) {
      getLogger().error(...args);
    },
    warn(...args: any[]) {
      getLogger().warn(...args);
    },
    info(...args: any[]) {
      getLogger().info(...args);
    },
  };
}

function setProcessState(settings: Settings) {
  const androidHome = settings.androidHome;
  const idbPath = settings.idbPath;

  if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
    process.env.ANDROID_HOME = androidHome;
    process.env.ANDROID_SDK_ROOT = androidHome;
  }

  // emulator/emulator is more reliable than tools/emulator, so prefer it if
  // it exists
  process.env.PATH =
    ['emulator', 'tools', 'platform-tools']
      .map((directory) => path.resolve(androidHome, directory))
      .join(':') +
    `:${idbPath}` +
    `:${process.env.PATH}`;
}
