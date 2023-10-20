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
  getAuthToken,
  getEnvironmentInfo,
  setupPrefetcher,
  startFlipperServer,
  startServer,
} from 'flipper-server-core';
import {
  FlipperServer,
  getLogger,
  isTest,
  Logger,
  setLoggerInstance,
  wrapRequire,
} from 'flipper-common';
import {initializeElectron} from './electron/initializeElectron';
import path from 'path';
import fs from 'fs-extra';
import {ElectronIpcClientRenderer} from './electronIpc';
import {KeytarModule} from 'flipper-server-core/src/utils/keytar';
import {initCompanionEnv} from 'flipper-server-companion';
import ReconnectingWebSocket from 'reconnecting-websocket';
import WS from 'ws';
import {Module} from 'module';

Module.prototype.require = wrapRequire(Module.prototype.require);
enableMapSet();

async function getKeytarModule(
  staticPath: string,
): Promise<KeytarModule | undefined> {
  let keytar: any = undefined;
  try {
    if (process.env.FLIPPER_DISABLE_KEYTAR) {
      console.log(
        'Using keytar in-memory implementation as per FLIPPER_DISABLE_KEYTAR env var.',
      );
      return undefined;
    }
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
  electronIpcClient: ElectronIpcClientRenderer,
): Promise<FlipperServer> {
  const execPath =
    process.execPath || (await electronIpcClient.send('getProcess')).execPath;
  const appPath = await electronIpcClient.send('getPath', 'app');
  const staticPath = getStaticPath(appPath);
  const isProduction = !/node_modules[\\/]electron[\\/]/.test(execPath);
  const environmentInfo = await getEnvironmentInfo(
    staticPath,
    isProduction,
    false,
  );
  const keytar: KeytarModule | undefined = await getKeytarModule(staticPath);
  const port = 52342;

  async function shutdown(): Promise<boolean> {
    console.info('[flipper-server] Attempt to shutdown.');

    try {
      const response = await fetch(`http://localhost:${port}/shutdown`);
      const json = await response.json();

      return json?.success;
    } catch {}

    return false;
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
    const success = await shutdown();
    console.info(`[flipper-server] Shutdown: ${success}`);
  }

  console.info('[flipper-server] Not running/listening, start');

  const {readyForIncomingConnections} = await startServer(
    {
      staticPath,
      entry: 'index.web.dev.html',
      port,
    },
    environmentInfo,
  );

  const server = await startFlipperServer(
    appPath,
    staticPath,
    '',
    false,
    keytar,
    'embedded',
    environmentInfo,
  );

  const token: string = await getAuthToken();
  const searchParams = new URLSearchParams({token});
  const TCPconnectionURL = new URL(`ws://localhost:${port}?${searchParams}`);

  const companionEnv = await initCompanionEnv(server);
  await server.connect();
  await readyForIncomingConnections(server, companionEnv);

  return getExternalServer(TCPconnectionURL);
}

async function start() {
  const logger = createDelegatedLogger();
  setLoggerInstance(logger);

  const electronIpcClient = new ElectronIpcClientRenderer();

  const flipperServer: FlipperServer = await getFlipperServer(
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
