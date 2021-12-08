/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import chalk from 'chalk';
import express, {Express} from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import socketio from 'socket.io';
import {hostname} from 'os';

type Config = {
  port: number;
  staticDir: string;
  entry: string;
};

export async function startBaseServer(config: Config): Promise<{
  app: Express;
  server: http.Server;
  socket: socketio.Server;
}> {
  checkDevServer();
  const {app, server} = await startAssetServer(config);
  const socket = addWebsocket(server);
  return {
    app,
    server,
    socket,
  };
}

function startAssetServer(
  config: Config,
): Promise<{app: Express; server: http.Server}> {
  const app = express();

  app.use((_req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  });

  app.get('/', (_req, res) => {
    fs.readFile(path.join(config.staticDir, config.entry), (_err, content) => {
      res.end(content);
    });
  });

  app.use(express.static(config.staticDir));

  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(config.port, 'localhost', () => resolve({app, server}));
  });
}

function addWebsocket(server: http.Server) {
  const io = new socketio.Server(server); // 3.1.0 socket.io doesn't have type definitions

  io.on('connection', (client) => {
    console.log(chalk.green(`Client connected ${client.id}`));
  });

  return io;
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
