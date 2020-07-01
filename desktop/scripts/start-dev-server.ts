/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const electronBinary: string = require('electron') as any;
import codeFrame from '@babel/code-frame';
import socketIo from 'socket.io';
import express, {Express} from 'express';
import detect from 'detect-port';
import child from 'child_process';
import AnsiToHtmlConverter from 'ansi-to-html';
import chalk from 'chalk';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import {compileMain, generatePluginEntryPoints} from './build-utils';
import Watchman from '../static/watchman';
import Metro from 'metro';
import MetroResolver from 'metro-resolver';
import {staticDir, appDir, babelTransformationsDir} from './paths';
import isFB from './isFB';
import getAppWatchFolders from './get-app-watch-folders';
import {getSourcePlugins} from '../static/getPlugins';
import {getPluginSourceFolders} from '../static/getPluginFolders';
import startWatchPlugins from '../static/startWatchPlugins';
import ensurePluginFoldersWatchable from '../static/ensurePluginFoldersWatchable';

const ansiToHtmlConverter = new AnsiToHtmlConverter();

const DEFAULT_PORT = (process.env.PORT || 3000) as number;

let shutdownElectron: (() => void) | undefined = undefined;

if (isFB && process.env.FLIPPER_FB === undefined) {
  process.env.FLIPPER_FB = 'true';
}
if (process.argv.includes('--no-embedded-plugins')) {
  process.env.FLIPPER_NO_EMBEDDED_PLUGINS = 'true';
}
if (process.argv.includes('--fast-refresh')) {
  process.env.FLIPPER_FAST_REFRESH = 'true';
}
// By default plugin auto-update is disabled in dev mode,
// but it is possible to enable it using this command line argument.
if (!process.argv.includes('--plugin-auto-update')) {
  process.env.FLIPPER_DISABLE_PLUGIN_AUTO_UPDATE = 'true';
}

function launchElectron(port: number) {
  const entry = process.env.FLIPPER_FAST_REFRESH ? 'init-fast-refresh' : 'init';
  const devServerURL = `http://localhost:${port}`;
  const bundleURL = `http://localhost:${port}/src/${entry}.bundle?platform=web&dev=true&minify=false`;
  const electronURL = `http://localhost:${port}/index.dev.html`;
  const args = [
    path.join(staticDir, 'index.js'),
    '--remote-debugging-port=9222',
    ...process.argv,
  ];
  const proc = child.spawn(electronBinary, args, {
    cwd: staticDir,
    env: {
      ...process.env,
      SONAR_ROOT: process.cwd(),
      BUNDLE_URL: bundleURL,
      ELECTRON_URL: electronURL,
      DEV_SERVER_URL: devServerURL,
    },
    stdio: 'inherit',
  });

  const electronCloseListener = () => {
    process.exit();
  };

  const processExitListener = () => {
    proc.kill();
  };

  proc.on('close', electronCloseListener);
  process.on('exit', processExitListener);

  return () => {
    proc.off('close', electronCloseListener);
    process.off('exit', processExitListener);
    proc.kill();
  };
}

async function startMetroServer(app: Express, server: http.Server) {
  const watchFolders = (await getAppWatchFolders()).concat(
    await getPluginSourceFolders(),
  );
  const baseConfig = await Metro.loadConfig();
  const config = Object.assign({}, baseConfig, {
    projectRoot: appDir,
    watchFolders,
    transformer: {
      ...baseConfig.transformer,
      babelTransformerPath: path.join(babelTransformationsDir, 'transform-app'),
    },
    resolver: {
      ...baseConfig.resolver,
      resolverMainFields: ['flipperBundlerEntry', 'module', 'main'],
      blacklistRE: /\.native\.js$/,
      resolveRequest: (context: any, moduleName: string, platform: string) => {
        if (moduleName.startsWith('./localhost:3000')) {
          moduleName = moduleName.replace('./localhost:3000', '.');
        }
        return MetroResolver.resolve(
          {...context, resolveRequest: null},
          moduleName,
          platform,
        );
      },
      sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'],
    },
    watch: true,
  });
  const connectMiddleware = await Metro.createConnectMiddleware(config);
  app.use(connectMiddleware.middleware);
  connectMiddleware.attachHmrServer(server);
}

function startAssetServer(
  port: number,
): Promise<{app: Express; server: http.Server}> {
  const app = express();

  app.use((req, res, next) => {
    if (knownErrors[req.url] != null) {
      delete knownErrors[req.url];
      outputScreen();
    }
    next();
  });

  app.use((req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  });

  app.post('/_restartElectron', (req, res) => {
    if (shutdownElectron) {
      shutdownElectron();
    }
    shutdownElectron = launchElectron(port);
    res.end();
  });

  app.get('/', (req, res) => {
    fs.readFile(path.join(staticDir, 'index.dev.html'), (err, content) => {
      res.end(content);
    });
  });

  app.use(express.static(staticDir));

  app.use(function (err: any, req: any, res: any, _next: any) {
    knownErrors[req.url] = err;
    outputScreen();
    res.status(500).send('Something broke, check the console!');
  });

  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(port, 'localhost', () => resolve({app, server}));
  });
}

async function addWebsocket(server: http.Server) {
  const io = socketIo(server);

  // notify connected clients that there's errors in the console
  io.on('connection', (client) => {
    if (hasErrors()) {
      client.emit('hasErrors', ansiToHtmlConverter.toHtml(buildErrorScreen()));
    }
  });

  // Refresh the app on changes.
  // When Fast Refresh enabled, reloads are performed by HMRClient, so don't need to watch manually here.
  if (!process.env.FLIPPER_FAST_REFRESH) {
    await startWatchChanges(io);
  }

  return io;
}

async function startWatchChanges(io: socketIo.Server) {
  try {
    const watchman = new Watchman(path.resolve(__dirname, '..'));
    await watchman.initialize();
    await Promise.all(
      ['app', 'pkg', 'doctor', 'flipper-plugin'].map((dir) =>
        watchman.startWatchFiles(
          dir,
          () => {
            io.emit('refresh');
          },
          {
            excludes: ['**/__tests__/**/*', '**/node_modules/**/*', '**/.*'],
          },
        ),
      ),
    );
    const plugins = await getSourcePlugins();
    await startWatchPlugins(plugins, () => {
      io.emit('refresh');
    });
  } catch (err) {
    console.error(
      'Failed to start watching for changes using Watchman, continue without hot reloading',
      err,
    );
  }
}

const knownErrors: {[key: string]: any} = {};

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

function outputScreen(socket?: socketIo.Server) {
  // output screen
  if (hasErrors()) {
    const errorScreen = buildErrorScreen();
    console.error(errorScreen);

    // notify live clients of errors
    socket?.emit('hasErrors', ansiToHtmlConverter.toHtml(errorScreen));
  } else {
    // eslint-disable-next-line no-console
    console.log(chalk.green('✔ No known errors'));
  }
}

(async () => {
  await generatePluginEntryPoints();
  await ensurePluginFoldersWatchable();
  const port = await detect(DEFAULT_PORT);
  const {app, server} = await startAssetServer(port);
  const socket = await addWebsocket(server);
  await startMetroServer(app, server);
  outputScreen(socket);
  await compileMain();
  shutdownElectron = launchElectron(port);
})();
