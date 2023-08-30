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
import {ServerOptions, VerifyClientCallbackSync, WebSocketServer} from 'ws';
import {WEBSOCKET_MAX_MESSAGE_SIZE} from '../app-connectivity/ServerWebSocket';
import {parse} from 'url';
import exitHook from 'exit-hook';
import {attachSocketServer} from './attachSocketServer';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {FlipperServerCompanionEnv} from 'flipper-server-companion';
import {validateAuthToken} from '../app-connectivity/certificate-exchange/certificate-utils';
import {tracker} from '../tracker';

type Config = {
  port: number;
  staticPath: string;
  entry: string;
};

type ReadyForConnections = (
  server: FlipperServerImpl,
  companionEnv: FlipperServerCompanionEnv,
) => Promise<void>;

const verifyAuthToken = (req: http.IncomingMessage): boolean => {
  let token: string | null = null;
  if (req.url) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    token = url.searchParams.get('token');
  }

  if (!token && req.headers['x-access-token']) {
    token = req.headers['x-access-token'] as string;
  }

  if (!token) {
    console.warn('[conn] A token is required for authentication');
    tracker.track('server-auth-token-verification', {
      successful: false,
      present: false,
      error: 'No token was supplied',
    });
    return false;
  }

  try {
    validateAuthToken(token);
    console.info('[conn] Token was successfully validated');
    tracker.track('server-auth-token-verification', {
      successful: true,
      present: true,
    });
  } catch (err) {
    console.warn('[conn] An invalid token was supplied for authentication');
    tracker.track('server-auth-token-verification', {
      successful: false,
      present: true,
      error: err.toString(),
    });
    return false;
  }
  return true;
};

let isReady = false;

/**
 * Orchestrates the creation of the HTTP server, proxy, and WS server.
 * @param config Server configuration.
 * @returns Returns a promise to the created server, proxy and WS server.
 */
export async function startServer(config: Config): Promise<{
  app: Express;
  server: http.Server;
  socket: WebSocketServer;
  readyForIncomingConnections: ReadyForConnections;
}> {
  return await startHTTPServer(config);
}

/**
 * Creates an express app with configured routing and creates
 * a proxy server.
 * @param config Server configuration.
 * @returns A promise to both app and HTTP server.
 */
async function startHTTPServer(config: Config): Promise<{
  app: Express;
  server: http.Server;
  socket: WebSocketServer;
  readyForIncomingConnections: ReadyForConnections;
}> {
  const app = express();

  app.use((_req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  });

  app.get('/', (_req, res) => {
    const resource = isReady
      ? path.join(config.staticPath, config.entry)
      : path.join(config.staticPath, 'loading.html');
    fs.readFile(resource, (_err, content) => {
      res.end(content);
    });
  });

  app.get('/health', (_req, res) => {
    res.end('flipper-ok');
  });

  app.use(express.static(config.staticPath));

  const server = http.createServer(app);
  const socket = attachWS(server, config);

  exitHook(() => {
    console.log('Shutdown server');
    server.close();
  });

  server.listen(config.port);

  return new Promise((resolve) => {
    console.log(`Starting server on http://localhost:${config.port}`);
    const readyForIncomingConnections = (
      serverImpl: FlipperServerImpl,
      companionEnv: FlipperServerCompanionEnv,
    ): Promise<void> => {
      attachSocketServer(socket, serverImpl, companionEnv);
      isReady = true;
      return new Promise((resolve) => {
        tracker.track('server-started', {
          port: config.port,
        });
        resolve();
      });
    };
    resolve({app, server, socket, readyForIncomingConnections});
  });
}

/**
 * Adds a WS to the existing HTTP server.
 * @param server HTTP server.
 * @param config Server configuration. Port is used to verify
 * incoming connections origin.
 * @returns Returns the created WS.
 */
function attachWS(server: http.Server, config: Config) {
  const localhost = 'localhost';
  const localhostIPV4 = `localhost:${config.port}`;
  const localhostIPV6 = `[::1]:${config.port}`;
  const localhostIPV6NoBrackets = `::1:${config.port}`;
  const localhostIPV4Electron = 'localhost:3000';

  const possibleHosts = [
    localhost,
    localhostIPV4,
    localhostIPV6,
    localhostIPV6NoBrackets,
    localhostIPV4Electron,
  ];
  const possibleOrigins = possibleHosts
    .map((host) => `http://${host}`)
    .concat(['file://']);

  const verifyClient: VerifyClientCallbackSync = ({origin, req}) => {
    const noOriginHeader = origin === undefined;
    if (
      (noOriginHeader || possibleOrigins.includes(origin)) &&
      req.headers.host &&
      possibleHosts.includes(req.headers.host)
    ) {
      // No origin header? The request is not originating from a browser, so should be OK to pass through
      // If origin matches our own address, it means we are serving the page.

      return process.env.SKIP_TOKEN_VERIFICATION ? true : verifyAuthToken(req);
    } else {
      // For now we don't allow cross origin request, so that an arbitrary website cannot try to
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

  const options: ServerOptions = {
    noServer: true,
    maxPayload: WEBSOCKET_MAX_MESSAGE_SIZE,
    verifyClient,
  };

  const wss = new WebSocketServer(options);
  server.on('upgrade', function upgrade(request, socket, head) {
    const {pathname} = parse(request.url!);

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
