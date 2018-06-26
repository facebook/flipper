/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
const electronBinary = require('electron');
const codeFrame = require('babel-code-frame');
const socketIo = require('socket.io');
const express = require('express');
const detect = require('detect-port');
const child = require('child_process');
const Convert = require('ansi-to-html');
const chalk = require('chalk');
const http = require('http');
const path = require('path');
const metro = require('../static/node_modules/metro');
const fs = require('fs');

const convertAnsi = new Convert();

const DEFAULT_PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, '..', 'static');

function launchElectron({bundleURL, electronURL}) {
  const args = [
    path.join(STATIC_DIR, 'index.js'),
    '--remote-debugging-port=9222',
  ];

  const proc = child.spawn(electronBinary, args, {
    cwd: STATIC_DIR,
    env: {
      ...process.env,
      SONAR_ROOT: process.cwd(),
      BUNDLE_URL: bundleURL,
      ELECTRON_URL: electronURL,
    },
    stdio: 'inherit',
  });

  proc.on('close', () => {
    process.exit();
  });

  process.on('exit', () => {
    proc.kill();
  });
}

function startMetroServer(port) {
  return metro.runServer({
    port,
    watch: true,
    config: {
      getProjectRoots: () => [path.join(__dirname, '..')],
      getTransformModulePath: () =>
        path.join(__dirname, '..', 'static', 'transforms', 'index.js'),
    },
  });
}

function startAssetServer(port) {
  const app = express();

  app.use((req, res, next) => {
    if (knownErrors[req.url] != null) {
      delete knownErrors[req.url];
      outputScreen();
    }
    next();
  });

  app.get('/', (req, res) => {
    fs.readFile(path.join(STATIC_DIR, 'index.dev.html'), (err, content) => {
      res.end(content);
    });
  });

  app.use(express.static(STATIC_DIR));

  app.use(function(err, req, res, next) {
    knownErrors[req.url] = err;
    outputScreen();
    res.status(500).send('Something broke, check the console!');
  });

  const server = http.createServer(app);

  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve(server));
  });
}

function addWebsocket(server) {
  const io = socketIo(server);

  // notify connected clients that there's errors in the console
  io.on('connection', client => {
    if (hasErrors()) {
      client.emit('hasErrors', convertAnsi.toHtml(buildErrorScreen()));
    }
  });

  // refresh the app on changes to the src folder
  // this can be removed once metroServer notifies us about file changes
  fs.watch(path.join(__dirname, '..', 'src'), () => {
    io.emit('refresh');
  });

  return io;
}

const knownErrors = {};

function hasErrors() {
  return Object.keys(knownErrors).length > 0;
}

function buildErrorScreen() {
  const lines = [
    chalk.red(`✖ Found ${Object.keys(knownErrors).length} errors`),
    '',
  ];

  for (const url in knownErrors) {
    const err = knownErrors[url];

    if (err.filename != null && err.lineNumber != null && err.column != null) {
      lines.push(chalk.inverse(err.filename));
      lines.push();
      lines.push(err.message);
      lines.push(
        codeFrame(
          fs.readFileSync(err.filename, 'utf8'),
          err.lineNumber,
          err.column,
        ),
      );
    } else {
      lines.push(err.stack);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function outputScreen(socket) {
  // output screen
  if (hasErrors()) {
    const errorScreen = buildErrorScreen();
    console.error(errorScreen);

    // notify live clients of errors
    socket.emit('hasErrors', convertAnsi.toHtml(errorScreen));
  } else {
    // eslint-disable-next-line no-console
    console.log(chalk.green('✔ No known errors'));
  }
}

(async () => {
  const assetServerPort = await detect(DEFAULT_PORT);
  const assetServer = await startAssetServer(assetServerPort);
  const socket = addWebsocket(assetServer);
  const metroServerPort = await detect(DEFAULT_PORT + 1);
  await startMetroServer(metroServerPort);
  outputScreen(socket);
  launchElectron({
    bundleURL: `http://localhost:${metroServerPort}/src/init.bundle`,
    electronURL: `http://localhost:${assetServerPort}/index.dev.html`,
  });
})();
