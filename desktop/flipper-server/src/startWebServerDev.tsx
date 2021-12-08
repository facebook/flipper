/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {hostname} from 'os';
import chalk from 'chalk';
import express, {Express} from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import socketio from 'socket.io';
import {getWatchFolders} from 'flipper-pkg-lib';
import Metro from 'metro';
import pFilter from 'p-filter';

const PORT = 52342;
const rootDir = path.resolve(__dirname, '..', '..');
const staticDir = path.join(rootDir, 'static');
const babelTransformationsDir = path.resolve(
  rootDir,
  'babel-transformer',
  'src',
);

const uiSourceDirs = [
  'flipper-ui-browser',
  'flipper-ui-core',
  'flipper-plugin',
  'flipper-common',
];

// This file is heavily inspired by scripts/start-dev-server.ts!
export async function startWebServerDev() {
  checkDevServer();
  //   await prepareDefaultPlugins(
  //     process.env.FLIPPER_RELEASE_CHANNEL === 'insiders',
  //   );
  //   await ensurePluginFoldersWatchable();
  const {app, server} = await startAssetServer(PORT);
  const socket = await addWebsocket(server);
  await startMetroServer(app, server, socket);
  //   await compileMain();
  //   if (dotenv && dotenv.parsed) {
  //     console.log('✅  Loaded env vars from .env file: ', dotenv.parsed);
  //   }
  //   shutdownElectron = launchElectron(port);
  console.log(
    `Flipper DEV server started at http://localhost:${PORT}/index.web.dev.html`,
  );
}

function looksLikeDevServer(): boolean {
  const hn = hostname();
  if (/^devvm.*\.facebook\.com$/.test(hn)) {
    return true;
  }
  if (hn.endsWith('.od.fbinfra.net')) {
    return true;
  }
  return false;
}

function checkDevServer() {
  if (looksLikeDevServer()) {
    console.log(
      chalk.red(
        `✖ It looks like you're trying to start Flipper on your OnDemand or DevServer, which is not supported. Please run this in a local checkout on your laptop or desktop instead.`,
      ),
    );
  }
}

function startAssetServer(
  port: number,
): Promise<{app: Express; server: http.Server}> {
  const app = express();

  app.use((_req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  });

  app.get('/', (_req, res) => {
    fs.readFile(path.join(staticDir, 'index.web.dev.html'), (_err, content) => {
      res.end(content);
    });
  });

  app.use(express.static(staticDir));

  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(port, 'localhost', () => resolve({app, server}));
  });
}

async function addWebsocket(server: http.Server) {
  const io = new socketio.Server(server); // 3.1.0 socket.io doesn't have type definitions

  io.on('connection', (client) => {
    console.log(chalk.green(`Client connected ${client.id}`));
  });

  // Refresh the app on changes.
  // When Fast Refresh enabled, reloads are performed by HMRClient, so don't need to watch manually here.
  //   if (!process.env.FLIPPER_FAST_REFRESH) {
  //     await startWatchChanges(io);
  //   }

  return io;
}

async function startMetroServer(
  app: Express,
  server: http.Server,
  socket: socketio.Server,
) {
  const watchFolders = await dedupeFolders(
    (
      await Promise.all(
        uiSourceDirs.map((dir) => getWatchFolders(path.resolve(rootDir, dir))),
      )
    ).flat(),
  );
  // console.log('Source dirs\n\t' + watchFolders.join('\n\t'));
  const baseConfig = await Metro.loadConfig();
  const config = Object.assign({}, baseConfig, {
    projectRoot: rootDir,
    watchFolders,
    transformer: {
      ...baseConfig.transformer,
      babelTransformerPath: path.join(babelTransformationsDir, 'transform-app'),
    },
    resolver: {
      ...baseConfig.resolver,
      resolverMainFields: ['flipperBundlerEntry', 'module', 'main'],
      blacklistRE: /\.native\.js$/,
      sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'],
    },
    watch: true,
  });
  const connectMiddleware = await Metro.createConnectMiddleware(config);
  app.use(connectMiddleware.middleware);
  connectMiddleware.attachHmrServer(server);
  app.use(function (err: any, _req: any, _res: any, next: any) {
    console.error(chalk.red('\n\nCompile error in client bundle\n'), err);
    socket.local.emit('hasErrors', err.toString());
    next();
  });
}

async function dedupeFolders(paths: string[]): Promise<string[]> {
  return pFilter(
    paths.filter((value, index, self) => self.indexOf(value) === index),
    (f) => fs.pathExists(f),
  );
}
