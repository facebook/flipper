/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import chalk from 'chalk';
import path from 'path';
// TODO: currently flipper-server is only suitable for development,
// needs to be come independently runnable, prebundled, distributed, etc!
// in future require conditionally
import {startWebServerDev} from './startWebServerDev';
import {startFlipperServer} from './startFlipperServer';
import {startBaseServer} from './startBaseServer';
import {startSocketServer} from './startSocketServer';

const PORT = 52342;
const rootDir = path.resolve(__dirname, '..', '..');
const staticDir = path.join(rootDir, 'static');

async function start() {
  const {app, server, socket} = await startBaseServer({
    port: PORT,
    staticDir,
    entry: 'index.web.dev.html',
  });

  const [flipperServer] = await Promise.all([
    startFlipperServer(rootDir, staticDir),
    startWebServerDev(app, server, socket, rootDir),
  ]);

  startSocketServer(flipperServer, socket);
}

start()
  .then(() => {
    console.log(
      `Flipper DEV server started at http://localhost:${PORT}/index.web.dev.html`,
    );
  })
  .catch((e) => {
    console.error(chalk.red('Server error: '), e);
    process.exit(1);
  });
