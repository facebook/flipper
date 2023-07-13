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
import {
  createFlipperServerWithSocket,
  FlipperServerState,
} from 'flipper-server-client';
import {
  checkPortInUse,
  FlipperServerImpl,
  getAuthToken,
  getEnvironmentInfo,
  getGatekeepers,
  hasAuthToken,
  loadLauncherSettings,
  loadProcessConfig,
  loadSettings,
  setupPrefetcher,
  startFlipperServer,
  startServer,
} from 'flipper-server-core';
import {
  FlipperServer,
  getLogger,
  isTest,
  Logger,
  parseEnvironmentVariables,
  setLoggerInstance,
  wrapRequire,
} from 'flipper-common';
import constants from './fb-stubs/constants';
import {initializeElectron} from './electron/initializeElectron';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import {ElectronIpcClientRenderer} from './electronIpc';
import {checkSocketInUse, makeSocketPath} from 'flipper-server-core';
import {KeytarModule} from 'flipper-server-core/src/utils/keytar';
import {initCompanionEnv} from 'flipper-server-companion';
import ReconnectingWebSocket from 'reconnecting-websocket';
import WS from 'ws';
import {Module} from 'module';

Module.prototype.require = wrapRequire(Module.prototype.require);
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

async function getExternalServer(url: URL) {
  const options = {
    WebSocket: class WSWithUnixDomainSocketSupport extends WS {
      constructor(url: string, protocols: string | string[]) {
        // Flipper exports could be large, and we snd them over the wire
        // Setting this limit fairly high (1GB) to allow any reasonable Flipper export to be loaded
        super(url, protocols, {maxPayload: 1024 * 1024 * 1024});
      }
    },
  };
  const socket = new ReconnectingWebSocket(url.toString(), [], options);
  const server = await createFlipperServerWithSocket(
    socket as WebSocket,
    (_state: FlipperServerState) => {},
  );

  return server;
}

async function getFlipperServer(
  logger: Logger,
  electronIpcClient: ElectronIpcClientRenderer,
): Promise<FlipperServer> {
  const execPath =
    process.execPath || (await electronIpcClient.send('getProcess')).execPath;
  const appPath = await electronIpcClient.send('getPath', 'app');
  const staticPath = getStaticPath(appPath);
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

  const socketPath = await makeSocketPath();
  const port = 52342;
  /**
   * Only attempt to use the auth token if one is available. Otherwise,
   * trying to get the auth token will try to generate one if it does not exist.
   * At this state, it would be impossible to generate it as our certificates
   * may not be available yet.
   */
  let token: string | undefined;
  if (await hasAuthToken()) {
    token = await getAuthToken();
  }
  // check first with the actual TCP socket
  const searchParams = new URLSearchParams(token ? {token} : {});
  const TCPconnectionURL = new URL(`ws://localhost:${port}?${searchParams}`);
  const UDSconnectionURL = new URL(`ws+unix://${socketPath}`);

  /**
   * Attempt to shutdown a running instance of Flipper server.
   * @param url The URL used for connection.
   */
  async function shutdown(url: URL) {
    console.info('[flipper-server] Attempt to shutdown.');

    const server = await getExternalServer(url);
    await server.exec('shutdown').catch(() => {
      /** shutdown will ultimately make this request fail, ignore error. */
      console.info('[flipper-server] Shutdown may have succeeded');
    });
  }

  /**
   * In this case, order matters. First, check if the TCP port is in use. If so,
   * then shut down the TCP socket. If not, then try the UDS socket.
   *
   * UDS doesn't accept arguments in the query string, this effectively creates a different
   * socket path which then doesn't match the one used by the server.
   */
  if (await checkPortInUse(port)) {
    console.warn(`[flipper-server] TCP port ${port} is already in use.`);

    await shutdown(TCPconnectionURL);
  } else if (await checkSocketInUse(socketPath)) {
    console.warn(`[flipper-server] UDS socket is already in use.`);

    await shutdown(UDSconnectionURL);
  }

  const getEmbeddedServer = async () => {
    const server = new FlipperServerImpl(
      {
        environmentInfo,
        env: parseEnvironmentVariables(env),
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

    return server;
  };

  if (serverUsageEnabled && (!settings.server || settings.server.enabled)) {
    console.info('flipper-server: not running/listening, start');

    const {readyForIncomingConnections} = await startServer({
      staticPath,
      entry: 'index.web.dev.html',
      tcp: false,
      port,
    });

    const server = await startFlipperServer(
      appPath,
      staticPath,
      '',
      false,
      keytar,
      'embedded',
      environmentInfo,
    );

    const companionEnv = await initCompanionEnv(server);
    await server.connect();
    await readyForIncomingConnections(server, companionEnv);

    return getExternalServer(
      os.platform() === 'win32' ? TCPconnectionURL : UDSconnectionURL,
    );
  }
  return getEmbeddedServer();
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
  document.getElementById('loading')!.textContent =
    'Failed to start Flipper. ' + e;
});

function getStaticPath(appPath: string) {
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
