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
import {initCompanionEnv} from 'flipper-server-companion';
import {startFlipperServer, startServer} from 'flipper-server-core';
import {isTest} from 'flipper-common';
import exitHook from 'exit-hook';

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
    tcp: {
      describe:
        'Open a TCP port (--no-tcp can be specified as to use unix-domain-socket exclusively)',
      type: 'boolean',
      default: true,
    },
  })
  .version('DEV')
  .help()
  .parse(process.argv.slice(1));

console.log(
  `Starting flipper server with ${
    argv.bundler ? 'UI bundle from source' : 'pre-bundled UI'
  }`,
);

const rootDir = argv.bundler
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..'); // in pre packaged versions of the server, static is copied inside the package
const staticDir = path.join(rootDir, 'static');

async function start() {
  const enhanceLogger = await initializeLogger(staticDir);

  let keytar: any = undefined;
  try {
    if (!isTest()) {
      const keytarPath = path.join(
        staticDir,
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

  const {app, server, socket, readyForIncomingConnections} = await startServer({
    staticDir,
    entry: `index.web${argv.bundler ? '.dev' : ''}.html`,
    port: argv.port,
    tcp: argv.tcp,
  });

  const flipperServer = await startFlipperServer(
    rootDir,
    staticDir,
    argv.settingsString,
    argv.launcherSettings,
    keytar,
    'external',
  );

  exitHook(async () => {
    await flipperServer.close();
  });

  enhanceLogger((logEntry) => {
    flipperServer.emit('server-log', logEntry);
  });

  const companionEnv = await initCompanionEnv(flipperServer);
  if (argv.failFast) {
    flipperServer.on('server-state', ({state}) => {
      if (state === 'error') {
        console.error(
          '[flipper-server-process-exit] state changed to error, process will exit.',
        );
        process.exit(1);
      }
    });
  }
  await flipperServer.connect();

  if (argv.bundler) {
    await attachDevServer(app, server, socket, rootDir);
  }
  await readyForIncomingConnections(flipperServer, companionEnv);
}

process.on('uncaughtException', (error) => {
  console.error(
    '[flipper-server-process-exit] uncaught exception, process will exit.',
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

start()
  .then(() => {
    if (!argv.tcp) {
      console.log('Flipper server started and listening');
      return;
    }
    console.log(
      'Flipper server started and listening at port ' + chalk.green(argv.port),
    );
    const url = `http://localhost:${argv.port}`;
    console.log('Go to: ' + chalk.green(chalk.bold(url)));
    if (argv.open) {
      open(url);
    }
  })
  .catch((e) => {
    console.error(chalk.red('Server startup error: '), e);
    process.exit(1);
  });
