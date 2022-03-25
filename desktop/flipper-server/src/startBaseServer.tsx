/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import express, {Express} from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import {VerifyClientCallbackSync, WebSocketServer} from 'ws';
import {WEBSOCKET_MAX_MESSAGE_SIZE} from 'flipper-server-core';
import {parse} from 'url';

type Config = {
  port: number;
  staticDir: string;
  entry: string;
};

export async function startBaseServer(config: Config): Promise<{
  app: Express;
  server: http.Server;
  socket: WebSocketServer;
}> {
  const {app, server} = await startAssetServer(config);
  const socket = addWebsocket(server, config);
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

  app.get('/health', (_req, res) => {
    res.end('flipper-ok');
  });

  app.use(express.static(config.staticDir));

  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(config.port, undefined, () => resolve({app, server}));
  });
}

function addWebsocket(server: http.Server, config: Config) {
  const localhostIPV4 = `localhost:${config.port}`;
  const localhostIPV6 = `[::1]:${config.port}`;
  const localhostIPV6NoBrackets = `::1:${config.port}`;

  const possibleHosts = [localhostIPV4, localhostIPV6, localhostIPV6NoBrackets];
  const possibleOrigins = possibleHosts.map((host) => `http://${host}`);

  const verifyClient: VerifyClientCallbackSync = ({origin, req}) => {
    const noOriginHeader = origin === undefined;
    if (
      (noOriginHeader || possibleOrigins.includes(origin)) &&
      req.headers.host &&
      possibleHosts.includes(req.headers.host)
    ) {
      // no origin header? The request is not originating from a browser, so should be OK to pass through
      // If origin matches our own address, it means we are serving the page
      return true;
    } else {
      // for now we don't allow cross origin request, so that an arbitrary website cannot try to
      // connect a socket to localhost:serverport, and try to use the all powerful Flipper APIs to read
      // for example files.
      // Potentially in the future we do want to allow this, e.g. if we want to connect to a local flipper-server
      // directly from intern. But before that, we should either authenticate the request somehow,
      // and discuss security impact and for example scope the files that can be read by Flipper.
      console.warn(
        `Refused socket connection from cross domain request, origin: ${origin}, host: ${
          req.headers.host
        }. Expected origins: ${possibleOrigins.join(
          ' or ',
        )}. Expected hosts: ${possibleHosts.join(' or ')}`,
      );
      return false;
    }
  };

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: WEBSOCKET_MAX_MESSAGE_SIZE,
    verifyClient,
  });

  server.on('upgrade', function upgrade(request, socket, head) {
    const {pathname} = parse(request.url);

    // Handled by Metro
    if (pathname === '/hot') {
      return;
    }

    if (pathname === '/') {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
      return;
    }

    console.error('addWebsocket.upgrade -> unknown pathname', pathname);
    socket.destroy();
  });

  return wss;
}
