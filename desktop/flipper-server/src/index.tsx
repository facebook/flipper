/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import process from 'process';
import chalk from 'chalk';
import path from 'path';
import {startFlipperServer} from './startFlipperServer';
import {startServer} from './startServer';
import {startSocketServer} from './startSocketServer';
import {startDevServer} from './startDevServer';

import yargs from 'yargs';
import open from 'open';
import {initCompanionEnv} from 'flipper-server-companion';

const argv = yargs
  .usage('yarn flipper-server [args]')
  .options({
    port: {
      describe: 'Port to serve on',
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
  // supress debug messages by default. TODO: make CLI flag
  console.debug = function () {
    // Noop
  };

  const {app, server, socket} = await startServer({
    port: argv.port,
    staticDir,
    entry: 'index.web.dev.html',
  });

  const flipperServer = await startFlipperServer(
    rootDir,
    staticDir,
    argv.settingsString,
    argv.launcherSettings,
  );
  const companionEnv = await initCompanionEnv(flipperServer);
  if (argv.failFast) {
    flipperServer.on('server-state', ({state}) => {
      if (state === 'error') {
        process.exit(1);
      }
    });
  }
  await flipperServer.connect();

  if (argv.bundler) {
    await startDevServer(app, server, socket, rootDir);
  }
  startSocketServer(flipperServer, socket, companionEnv);
}

start()
  .then(() => {
    console.log(
      'Flipper server started and listening at port ' + chalk.green(argv.port),
    );
    const url = `http://localhost:${argv.port}/index.web${
      argv.bundler ? '.dev' : ''
    }.html`;
    console.log('Go to: ' + chalk.green(chalk.bold(url)));
    if (argv.open) {
      open(url);
    }
  })
  .catch((e) => {
    console.error(chalk.red('Server startup error: '), e);
    process.exit(1);
  });
