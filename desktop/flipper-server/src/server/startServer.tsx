/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import express, {Express, RequestHandler} from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import {ServerOptions, VerifyClientCallbackSync, WebSocketServer} from 'ws';
import {WEBSOCKET_MAX_MESSAGE_SIZE} from '../app-connectivity/ServerWebSocket';
import {parse} from 'url';
import exitHook from 'exit-hook';
import {attachSocketServer} from './attachSocketServer';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {
  getAuthToken,
  validateAuthToken,
} from '../app-connectivity/certificate-exchange/certificate-utils';
import {tracker} from '../tracker';
import {EnvironmentInfo, isProduction} from 'flipper-common';
import {GRAPH_SECRET} from '../fb-stubs/constants';
import {sessionId} from '../sessionId';
import {UIPreference, openUI} from '../utils/openUI';
import {processExit} from '../utils/processExit';

import util from 'node:util';

type Config = {
  port: number;
  staticPath: string;
  entry: string;
};

type ReadyForConnections = (server: FlipperServerImpl) => Promise<void>;

const verifyAuthToken = (req: http.IncomingMessage): boolean => {
  let token: string | null = null;

  if (req.url) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    token = url.searchParams.get('token');
  }

  if (!token && req.headers['x-access-token']) {
    token = req.headers['x-access-token'] as string;
  }

  if (!isProduction()) {
    console.info('[conn] verifyAuthToken -> token', token);
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
 * The following two variables are used to control when
 * the server is ready to accept incoming connections.
 * - isReady, is used to synchronously check if the server is
 * ready or not.
 * - isReadyWaitable achieves the same but is used by
 * asynchronous functions which may want to wait until the
 * server is ready.
 */
let isReady = false;
let isReadyWaitable: Promise<void> | undefined;

/**
 * Time to wait until server becomes ready to accept incoming connections.
 * If within 30 seconds it is not ready, the server is considered unresponsive
 * and must be terminated.
 */
const timeoutSeconds = 30;

/**
 * Orchestrates the creation of the HTTP server, proxy, and WS server.
 * @param config Server configuration.
 * @returns Returns a promise to the created server, proxy and WS server.
 */
export async function startServer(
  config: Config,
  environmentInfo: EnvironmentInfo,
): Promise<{
  app: Express;
  server: http.Server;
  socket: WebSocketServer;
  readyForIncomingConnections: ReadyForConnections;
}> {
  setTimeout(() => {
    if (!isReady && isProduction()) {
      tracker.track('server-ready-timeout', {timeout: timeoutSeconds});
      console.error(
        `[flipper-server] Unable to become ready within ${timeoutSeconds} seconds, exit`,
      );
      processExit(1);
    }
  }, timeoutSeconds * 1000);

  return await startHTTPServer(config, environmentInfo);
}

/**
 * Creates an express app with configured routing and creates
 * a proxy server.
 * @param config Server configuration.
 * @returns A promise to both app and HTTP server.
 */
async function startHTTPServer(
  config: Config,
  environmentInfo: EnvironmentInfo,
): Promise<{
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

  const serveRoot: RequestHandler = async (_req, res) => {
    const resource = isReady
      ? path.join(config.staticPath, config.entry)
      : path.join(config.staticPath, 'loading.html');
    const token = await getAuthToken();

    const flipperConfig = {
      theme: 'light',
      entryPoint: isProduction()
        ? 'bundle.js'
        : 'flipper-ui/src/index-fast-refresh.bundle?platform=web&dev=true&minify=false',
      debug: !isProduction(),
      graphSecret: GRAPH_SECRET,
      appVersion: environmentInfo.appVersion,
      sessionId,
      unixname: environmentInfo.os.unixname,
      authToken: token,
    };

    fs.readFile(resource, (_err, content) => {
      const processedContent = content
        .toString()
        .replace('FLIPPER_CONFIG_PLACEHOLDER', util.inspect(flipperConfig));
      res.end(processedContent);
    });
  };
  app.get('/', serveRoot);
  app.get('/index.web.html', serveRoot);

  app.get('/ready', (_req, res) => {
    tracker.track('server-endpoint-hit', {name: 'ready'});
    res.json({isReady});
  });

  app.get('/info', (_req, res) => {
    tracker.track('server-endpoint-hit', {name: 'info'});
    res.json(environmentInfo);
  });

  app.get('/shutdown', (_req, res) => {
    console.info(
      '[flipper-server] Received shutdown request, process will terminate',
    );
    tracker.track('server-endpoint-hit', {name: 'shutdown'});
    res.json({success: true});

    // Just exit the process, this will trigger the shutdown hooks.
    // Do not use prcoessExit util as we want the serve to shutdown immediately
    process.exit(0);
  });

  app.get('/health', (_req, res) => {
    tracker.track('server-endpoint-hit', {name: 'health'});
    res.end('flipper-ok');
  });

  app.get('/open-ui', (_req, res) => {
    tracker.track('server-endpoint-hit', {name: 'open-ui'});
    const preference = isProduction() ? UIPreference.PWA : UIPreference.Browser;
    openUI(preference, config.port);
    res.json({success: true});
  });

  app.use(express.static(config.staticPath));

  const server = http.createServer(app);
  const socket = attachWS(server, config);

  exitHook(() => {
    console.log('[flipper-server] Shutdown HTTP server');
    server.close();
  });

  server.on('error', (e: NodeJS.ErrnoException) => {
    console.warn('[flipper-server] HTTP server error: ', e.code);
    tracker.track('server-error', {code: e.code, message: e.message});

    if (e.code === 'EADDRINUSE') {
      console.warn(
        `[flipper-server] Unable to listen at port: ${config.port}, is already in use`,
      );
      tracker.track('server-socket-already-in-use', {});
      processExit(1);
    }
  });

  server.listen(config.port);

  /**
   * Create the promise which can be waited on. In this case,
   * a reference to resolve is kept outside of the body of the promise
   * so that other asynchronous functions can resolve the promise
   * on its behalf.
   */
  let isReadyResolver: (value: void | PromiseLike<void>) => void;
  isReadyWaitable = new Promise((resolve, _reject) => {
    isReadyResolver = resolve;
  });

  return new Promise((resolve) => {
    console.info(
      `[flipper-server] Starting server on http://localhost:${config.port}`,
    );
    const readyForIncomingConnections = (
      serverImpl: FlipperServerImpl,
    ): Promise<void> => {
      attachSocketServer(socket, serverImpl);
      /**
       * At this point, the server is ready to accept incoming
       * connections. Change the isReady state and resolve the
       * promise so that other asychronous function become unblocked.
       */
      isReady = true;
      isReadyResolver();
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
function attachWS(server: http.Server, _config: Config) {
  const verifyClient: VerifyClientCallbackSync = ({req}) => {
    return process.env.SKIP_TOKEN_VERIFICATION ? true : verifyAuthToken(req);
  };

  const options: ServerOptions = {
    noServer: true,
    maxPayload: WEBSOCKET_MAX_MESSAGE_SIZE,
    verifyClient,
  };

  const wss = new WebSocketServer(options);
  server.on('upgrade', async function upgrade(request, socket, head) {
    if (!request.url) {
      console.log('[flipper-server] No request URL available');
      socket.destroy();
      return;
    }

    const {pathname} = parse(request.url);

    // Handled by Metro
    if (pathname === '/hot') {
      return;
    }

    if (pathname === '/') {
      // Wait until the server is ready to accept incoming connections.
      await isReadyWaitable;
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
      return;
    }

    console.error(
      '[flipper-server] Unable to upgrade, unknown pathname',
      pathname,
    );
    socket.destroy();
  });

  return wss;
}
