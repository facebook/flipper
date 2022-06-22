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
import {createFlipperServer, FlipperServerState} from 'flipper-frontend-core';
import {
  FlipperServerImpl,
  getEnvironmentInfo,
  getGatekeepers,
  loadLauncherSettings,
  loadProcessConfig,
  loadSettings,
  setupPrefetcher,
  startFlipperServer,
  startServer,
  Tail,
} from 'flipper-server-core';
import {
  FlipperServer,
  getLogger,
  LoggerInfo,
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
import {ElectronIpcClientRenderer} from './electronIpc';
import {checkSocketInUse, makeSocketPath} from 'flipper-server-core';
import {KeytarModule} from 'flipper-server-core/src/utils/keytar';
import {initCompanionEnv} from 'flipper-server-companion';

enableMapSet();

async function getKeytarModule(staticPath: string): Promise<KeytarModule> {
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
  return keytar;
}

async function getFlipperServer(
  logger: Logger,
  electronIpcClient: ElectronIpcClientRenderer,
): Promise<FlipperServer> {
  const execPath =
    process.execPath || (await electronIpcClient.send('getProcess')).execPath;
  const appPath = await electronIpcClient.send('getPath', 'app');
  const staticPath = getStaticDir(appPath);
  const isProduction = !/node_modules[\\/]electron[\\/]/.test(execPath);
  const env = process.env;
  const environmentInfo = await getEnvironmentInfo(
    staticPath,
    isProduction,
    false,
  );
  const keytar: KeytarModule = await getKeytarModule(staticPath);
  const gatekeepers = getGatekeepers(environmentInfo.os.unixname);

  const serverUsageEnabled = gatekeepers['flipper_desktop_use_server'];
  const settings = await loadSettings();

  if (serverUsageEnabled && (!settings.server || settings.server.enabled)) {
    const socketPath = await makeSocketPath();
    if (!(await checkSocketInUse(socketPath))) {
      console.info('flipper-server: not running/listening, start');

      const {readyForIncomingConnections} = await startServer({
        port: 52342,
        staticDir: staticPath,
        entry: 'index.web.dev.html',
      });

      const server = await startFlipperServer(
        appPath,
        staticPath,
        '',
        false,
        keytar,
        'embedded',
      );

      const companionEnv = await initCompanionEnv(server);
      await server.connect();

      await readyForIncomingConnections(server, companionEnv);
    } else {
      console.info('flipper-server: already running');
      const loggerOutputFile = 'flipper-server-log.out';

      tailServerLogs(path.join(staticPath, loggerOutputFile));
    }

    const flipperServer = await createFlipperServer(
      'localhost',
      52342,
      (_state: FlipperServerState) => {},
    );
    return flipperServer;
  } else {
    const flipperServer = new FlipperServerImpl(
      {
        environmentInfo,
        env: parseEnvironmentVariables(env),
        // TODO: make username parameterizable
        gatekeepers: gatekeepers,
        paths: {
          appPath,
          homePath: await electronIpcClient.send('getPath', 'home'),
          execPath,
          staticPath,
          tempPath: await electronIpcClient.send('getPath', 'temp'),
          desktopPath: await electronIpcClient.send('getPath', 'desktop'),
        },
        launcherSettings: await loadLauncherSettings(),
        processConfig: loadProcessConfig(env),
        settings,
        validWebSocketOrigins:
          constants.VALID_WEB_SOCKET_REQUEST_ORIGIN_PREFIXES,
      },
      logger,
      keytar,
    );

    return flipperServer;
  }
}

async function start() {
  const logger = createDelegatedLogger();
  setLoggerInstance(logger);

  const electronIpcClient = new ElectronIpcClientRenderer();

  const flipperServer: FlipperServer = await getFlipperServer(
    logger,
    electronIpcClient,
  );
  const flipperServerConfig = await flipperServer.exec('get-config');

  await initializeElectron(
    flipperServer,
    flipperServerConfig,
    electronIpcClient,
  );

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

function getStaticDir(appPath: string) {
  let _staticPath = path.resolve(__dirname, '..', '..', 'static');
  // fs.existSync used here, as fs-extra doesn't resovle properly in the app.asar
  /* eslint-disable node/no-sync*/
  if (fs.existsSync(_staticPath)) {
    // True in unit tests
    return _staticPath;
  }
  if (fs.existsSync(appPath)) {
    _staticPath = path.join(appPath);
  }
  if (!fs.existsSync(_staticPath)) {
    throw new Error('Static path does not exist: ' + _staticPath);
  }
  /* eslint-enable node/no-sync*/
  return _staticPath;
}

function tailServerLogs(logsPath: string) {
  console.info('flipper-server logs located at: ', logsPath);
  const tail = new Tail(logsPath);
  tail.on('line', (line: any) => {
    try {
      const loggerInfo: LoggerInfo = JSON.parse(line);
      console[loggerInfo.type](loggerInfo.msg);
    } catch (_) {}
  });
  tail.watch();
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
