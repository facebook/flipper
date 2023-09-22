/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import './fb-stubs';
import './electronRequire';
import process from 'process';
import chalk from 'chalk';
import path from 'path';
import {attachDevServer} from './attachDevServer';
import {initializeLogger} from './logger';
import fs from 'fs-extra';
import yargs from 'yargs';
import open from 'open';
import os from 'os';
import {initCompanionEnv} from 'flipper-server-companion';
import {
  checkPortInUse,
  getEnvironmentInfo,
  startFlipperServer,
  startServer,
  tracker,
} from 'flipper-server-core';
import {isTest} from 'flipper-common';
import exitHook from 'exit-hook';
import {getAuthToken} from 'flipper-server-core';
import {findInstallation} from './findInstallation';

const argv = yargs
  .usage('yarn flipper-server [args]')
  .options({
    port: {
      describe: 'TCP port to serve on',
      type: 'number',
      default: 52342,
    },
    bundler: {
      describe:
        'Serve the UI bundle from source. This option only works for source checkouts',
      type: 'boolean',
      default: false,
    },
    open: {
      describe: 'Open Flipper in the default browser after starting',
      type: 'boolean',
      default: true,
    },
    failFast: {
      describe:
        'Exit the process immediately if the server cannot start, for example due to an incorrect configuration.',
      type: 'boolean',
      default: false,
    },
    settingsString: {
      describe: `override the existing defaults settings of flipper (settings.json file) e.g "{"androidHome":"/usr/local/bin","enableAndroid":true}"`,
      type: 'string',
      default: '',
    },
    launcherSettings: {
      describe:
        'Open Flipper with the configuration stored in .config folder for the launcher',
      type: 'boolean',
      default: true,
    },
    replace: {
      describe: 'Replaces any running instance, if any.',
      type: 'boolean',
      default: true,
    },
  })
  .version('DEV')
  .help()
  .parse(process.argv.slice(1));

console.log(
  `[flipper-server] Starting flipper server with ${
    argv.bundler ? 'UI bundle from source' : 'pre-bundled UI'
  }`,
);

/**
 * When running as a standlone app not run from the terminal, the process itself
 * doesn't inherit the user's terminal PATH environment variable.
 * The PATH, when NOT launched from terminal is `/usr/bin:/bin:/usr/sbin:/sbin`
 * which is missing `/usr/local/bin`.
 */
if (os.platform() !== 'win32') {
  process.env.PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
}

const rootPath = argv.bundler
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..'); // in pre packaged versions of the server, static is copied inside the package
const staticPath = path.join(rootPath, 'static');

async function shutdown(): Promise<boolean> {
  console.info('[flipper-server] Attempt to shutdown.');

  try {
    const response = await fetch(`http://localhost:${argv.port}/shutdown`);
    const json = await response.json();

    return json?.success;
  } catch {}

  return false;
}

async function start() {
  const t0 = performance.now();

  const isProduction =
    process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';
  const environmentInfo = await getEnvironmentInfo(
    rootPath,
    isProduction,
    true,
  );

  await initializeLogger(environmentInfo, staticPath);

  const t1 = performance.now();
  const loggerInitializedMS = t1 - t0;
  console.info(
    `[flipper-server][bootstrap] Logger initialised (${loggerInitializedMS} ms)`,
  );

  let keytar: any = undefined;
  try {
    if (process.env.FLIPPER_DISABLE_KEYTAR) {
      console.log(
        '[flipper-server][bootstrap] Using keytar in-memory implementation as per FLIPPER_DISABLE_KEYTAR env var.',
      );
    } else if (!isTest()) {
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
    console.error('[flipper-server] Failed to load keytar:', e);
  }

  const t2 = performance.now();
  const keytarLoadedMS = t2 - t1;
  console.info(
    `[flipper-server][bootstrap] Keytar loaded (${keytarLoadedMS} ms)`,
  );

  if (await checkPortInUse(argv.port)) {
    console.warn(`[flipper-server] Port ${argv.port} is already in use`);
    if (!argv.replace) {
      console.info(`[flipper-server] Not replacing existing instance, exiting`);
      return;
    }
    const success = await shutdown();
    console.info(`[flipper-server] Shutdown: ${success}`);
  }

  const t3 = performance.now();
  const runningInstanceShutdownMS = t3 - t2;
  console.info(
    `[flipper-server][bootstrap] Check for running instances completed (${runningInstanceShutdownMS} ms)`,
  );

  const {app, server, socket, readyForIncomingConnections} = await startServer(
    {
      staticPath,
      entry: `index.web${argv.bundler ? '.dev' : ''}.html`,
      port: argv.port,
    },
    environmentInfo,
  );

  const t4 = performance.now();
  const httpServerStartedMS = t4 - t3;

  console.info(
    `[flipper-server][bootstrap] HTTP server started (${httpServerStartedMS} ms)`,
  );

  const flipperServer = await startFlipperServer(
    rootPath,
    staticPath,
    argv.settingsString,
    argv.launcherSettings,
    keytar,
    'external',
    environmentInfo,
  );

  const t5 = performance.now();
  const serverCreatedMS = t5 - t4;
  console.info(
    `[flipper-server][bootstrap] FlipperServer created (${serverCreatedMS} ms)`,
  );

  // At this point, the HTTP server is ready and configuration is set.
  await launch();

  const t6 = performance.now();
  const launchedMS = t6 - t5;

  exitHook(async () => {
    console.log('[flipper-server] Shutdown Flipper server');
    await flipperServer.close();
  });

  const companionEnv = await initCompanionEnv(flipperServer);

  const t7 = performance.now();
  const companionEnvironmentInitializedMS = t7 - t6;

  console.info(
    `[flipper-server][bootstrap] Companion environment initialised (${companionEnvironmentInitializedMS} ms)`,
  );

  if (argv.failFast) {
    flipperServer.on('server-state', ({state}) => {
      if (state === 'error') {
        console.error(
          '[flipper-server] state changed to error, process will exit.',
        );
        process.exit(1);
      }
    });
  }
  await flipperServer.connect();

  const t8 = performance.now();
  const appServerStartedMS = t8 - t7;
  console.info(
    `[flipper-server][bootstrap] Ready for app connections (${appServerStartedMS} ms)`,
  );

  if (argv.bundler) {
    await attachDevServer(app, server, socket, rootPath);
  }

  const t9 = performance.now();
  const developmentServerAttachedMS = t9 - t8;
  console.info(
    `[flipper-server][bootstrap] Development server attached (${developmentServerAttachedMS} ms)`,
  );
  readyForIncomingConnections(flipperServer, companionEnv);

  const t10 = performance.now();
  const serverStartedMS = t10 - t9;
  console.info(
    `[flipper-server][bootstrap] Listening at port ${chalk.green(
      argv.port,
    )} (${serverStartedMS} ms)`,
  );

  tracker.track('server-bootstrap-performance', {
    loggerInitializedMS,
    keytarLoadedMS,
    runningInstanceShutdownMS,
    httpServerStartedMS,
    serverCreatedMS,
    companionEnvironmentInitializedMS,
    appServerStartedMS,
    developmentServerAttachedMS,
    serverStartedMS,
    launchedMS,
  });
}

async function launch() {
  console.info('[flipper-server] Launch UI');

  if (!argv.open) {
    return;
  }

  const openInBrowser = async () => {
    console.info('[flipper-server] Open in browser');
    const token = await getAuthToken();

    console.info('[flipper-server] Token is available: ' + token !== undefined);

    const searchParams = new URLSearchParams({token: token ?? ''});
    const url = new URL(`http://localhost:${argv.port}?${searchParams}`);

    open(url.toString(), {app: {name: open.apps.chrome}});
  };

  if (argv.bundler) {
    await openInBrowser();
  } else {
    const path = await findInstallation();
    if (path) {
      open(path);
    } else {
      await openInBrowser();
    }
  }

  console.info('[flipper-server] Launch UI completed');
}

process.on('uncaughtException', (error) => {
  console.error(
    '[flipper-server] uncaught exception, process will exit.',
    error,
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn(
    '[flipper-server] unhandled rejection for:',
    promise,
    'reason:',
    reason,
  );
});

start().catch((e) => {
  console.error(chalk.red('Server startup error: '), e);
  process.exit(1);
});
