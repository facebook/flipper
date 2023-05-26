/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';

import express, {Express} from 'express';
import http, {ServerResponse} from 'http';
import path from 'path';
import fs from 'fs-extra';
import {ServerOptions, VerifyClientCallbackSync, WebSocketServer} from 'ws';
import {WEBSOCKET_MAX_MESSAGE_SIZE} from '../comms/ServerWebSocket';
import {parse} from 'url';
import {makeSocketPath, checkSocketInUse} from './utilities';

import proxy from 'http-proxy';
import exitHook from 'exit-hook';
import {attachSocketServer} from './attachSocketServer';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {FlipperServerCompanionEnv} from 'flipper-server-companion';
import {validateAuthToken} from '../utils/certificateUtils';
import {tracker} from '../utils/tracker';

type Config = {
  port: number;
  staticPath: string;
  entry: string;
  tcp: boolean;
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
    fs.readFile(path.join(config.staticPath, config.entry), (_err, content) => {
      res.end(content);
    });
  });

  app.get('/health', (_req, res) => {
    res.end('flipper-ok');
  });

  app.use(express.static(config.staticPath));

  return startProxyServer(config, app);
}

/**
 * Creates and starts the HTTP and proxy servers.
 * @param config Server configuration.
 * @param app Express app.
 * @returns Returns both the app and server configured and
 * listening.
 */
async function startProxyServer(
  config: Config,
  app: Express,
): Promise<{
  app: Express;
  server: http.Server;
  socket: WebSocketServer;
  readyForIncomingConnections: ReadyForConnections;
}> {
  const server = http.createServer(app);
  const socket = addWebsocket(server, config);

  // For now, we only support domain socket access on POSIX-like systems.
  // On Windows, a proxy is not created and the server starts
  // listening at the specified port.
  if (os.platform() === 'win32') {
    if (!config.tcp) {
      console.warn(
        'No port was supplied and domain socket access is not available for non-POSIX systems, falling back to TCP',
      );
    }
    return new Promise((resolve) => {
      console.log(`Starting server on http://localhost:${config.port}`);
      const readyForIncomingConnections = (
        serverImpl: FlipperServerImpl,
        companionEnv: FlipperServerCompanionEnv,
      ): Promise<void> => {
        attachSocketServer(socket, serverImpl, companionEnv);
        return new Promise((resolve) => {
          server.listen(config.port, undefined, () => resolve());
        });
      };
      resolve({app, server, socket, readyForIncomingConnections});
    });
  }

  const socketPath = await makeSocketPath();
  if (await checkSocketInUse(socketPath)) {
    console.warn(
      `Cannot start flipper-server because socket ${socketPath} is in use.`,
    );
    tracker.track('server-socket-already-in-use', {});
  } else {
    console.info(`Cleaning up stale socket ${socketPath}`);
    await fs.rm(socketPath, {force: true});
  }

  const proxyServer: proxy | undefined = config.tcp
    ? proxy.createProxyServer({
        target: {host: 'localhost', port: 0, socketPath},
        autoRewrite: true,
        ws: true,
      })
    : undefined;

  console.log('Starting socket server on ', socketPath);
  if (proxyServer) {
    console.log(`Starting proxy server on http://localhost:${config.port}`);
  }

  exitHook(() => {
    console.log('Shutdown server');
    proxyServer?.close();
    server.close();

    console.log('Cleaning up socket on exit:', socketPath);
    // This *must* run synchronously and we're not blocking any UI loop by definition.
    // eslint-disable-next-line node/no-sync
    fs.rmSync(socketPath, {force: true});
  });

  proxyServer?.on('error', (err, _req, res) => {
    console.warn('Error in proxy server:', err);
    if (res instanceof ServerResponse) {
      res.writeHead(502, 'Failed to proxy request');
    }
    res.end('Failed to proxy request: ' + err);
    tracker.track('server-proxy-error', {error: err.message});
  });

  return new Promise((resolve) => {
    const readyForIncomingConnections = (
      serverImpl: FlipperServerImpl,
      companionEnv: FlipperServerCompanionEnv,
    ): Promise<void> => {
      attachSocketServer(socket, serverImpl, companionEnv);
      return new Promise((resolve) => {
        proxyServer?.listen(config.port);
        server.listen(socketPath, undefined, () => resolve());
        tracker.track('server-started', {
          port: config.port,
          tcp: config.tcp,
        });
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
function addWebsocket(server: http.Server, config: Config) {
  const localhostIPV4 = `localhost:${config.port}`;
  const localhostIPV6 = `[::1]:${config.port}`;
  const localhostIPV6NoBrackets = `::1:${config.port}`;
  const localhostIPV4Electron = 'localhost:3000';

  const possibleHosts = [
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
      // no origin header? The request is not originating from a browser, so should be OK to pass through
      // If origin matches our own address, it means we are serving the page.

      return process.env.SKIP_TOKEN_VERIFICATION ? true : verifyAuthToken(req);
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

  const options: ServerOptions = {
    noServer: true,
    maxPayload: WEBSOCKET_MAX_MESSAGE_SIZE,
  };
  if (config.tcp) {
    options.verifyClient = verifyClient;
  }

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
