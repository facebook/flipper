/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const dotenv = require('dotenv').config();
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
import {hostname} from 'os';
import {compileMain, prepareDefaultPlugins} from './build-utils';
import Watchman from './watchman';
import Metro from 'metro';
import {staticDir, babelTransformationsDir, rootDir} from './paths';
import isFB from './isFB';
import getAppWatchFolders from './get-app-watch-folders';
import {getPluginSourceFolders} from 'flipper-plugin-lib';
import ensurePluginFoldersWatchable from './ensurePluginFoldersWatchable';
import startWatchPlugins from './startWatchPlugins';
import yargs from 'yargs';

const argv = yargs
  .usage('yarn start [args]')
  .options({
    'default-plugins': {
      describe:
        'Enables embedding of default plugins into Flipper package so they are always available. The flag is enabled by default. Env var FLIPPER_NO_DEFAULT_PLUGINS is equivalent to the command-line option "--no-default-plugins".',
      type: 'boolean',
    },
    'bundled-plugins': {
      describe:
        'Enables bundling of plugins into Flipper bundle. This is useful for debugging, because it makes Flipper dev mode loading faster and unblocks fast refresh. The flag is enabled by default. Env var FLIPPER_NO_BUNDLEDD_PLUGINS is equivalent to the command-line option "--no-bundled-plugins".',
      type: 'boolean',
    },
    'rebuild-plugins': {
      describe:
        'Enables rebuilding of default plugins on Flipper build. Only make sense in conjunction with "--no-bundled-plugins". Enabled by default, but if disabled using "--no-plugin-rebuild", then plugins are just released as is without rebuilding. This can save some time if you know plugin bundles are already up-to-date.',
      type: 'boolean',
    },
    'fast-refresh': {
      describe:
        'Enable Fast Refresh - quick reload of UI component changes without restarting Flipper. The flag is disabled by default. Env var FLIPPER_FAST_REFRESH is equivalent to the command-line option "--fast-refresh".',
      type: 'boolean',
    },
    'plugin-marketplace': {
      describe:
        'Enable plugin marketplace - ability to install plugins from NPM or other sources. Without the flag Flipper will only show default plugins. The flag is disabled by default in dev mode. Env var FLIPPER_NO_PLUGIN_MARKETPLACE is equivalent to the command-line option "--no-plugin-marketplace"',
      type: 'boolean',
    },
    'plugin-auto-update-interval': {
      describe:
        '[FB-internal only] Set custom interval in milliseconds for plugin auto-update checks. Env var FLIPPER_PLUGIN_AUTO_UPDATE_POLLING_INTERVAL is equivalent to this command-line option.',
      type: 'number',
    },
    'enabled-plugins': {
      describe:
        'Load only specified plugins and skip loading rest. This is useful when you are developing only one or few plugins. Plugins to load can be specified as a comma-separated list with either plugin id or name used as identifier, e.g. "--enabled-plugins network,inspector". The flag is not provided by default which means that all plugins loaded.',
      type: 'array',
    },
    'open-dev-tools': {
      describe:
        'Open Dev Tools window on startup. The flag is disabled by default. Env var FLIPPER_OPEN_DEV_TOOLS is equivalent to the command-line option "--open-dev-tools". If "FLIPPER_UPDATE_DEV_TOOLS=true" is set additionally, Flipper will try to update the dev tools from the play store.',
      type: 'boolean',
    },
    'dev-server-port': {
      describe:
        'Dev server port. 3000 by default. Env var "PORT=3001" is equivalent to the command-line option "--dev-server-port 3001".',
      default: 3000,
      type: 'number',
    },
    'enable-all-gks': {
      describe:
        '[FB-internal only] Will yield `true` on any GK. Disabled by default. Setting env var FLIPPER_ENABLE_ALL_GKS is equivalent',
      type: 'boolean',
    },
    channel: {
      describe:
        '[FB-internal only] Release channel. "stable" by default. Setting env var "FLIPPER_RELEASE_CHANNEL" is equivalent.',
      choices: ['stable', 'insiders'],
    },
    'public-build': {
      describe:
        '[FB-internal only] Will force using public sources only, to be able to iterate quickly on the public version. If sources are checked out from GitHub this is already the default. Setting env var "FLIPPER_FORCE_PUBLIC_BUILD" is equivalent.',
      type: 'boolean',
    },
    'force-version': {
      describe:
        'Will force using the given value as Flipper version, to be able to test logic which is version-dependent. Setting env var "FLIPPER_FORCE_VERSION" is equivalent.',
      type: 'string',
    },
  })
  .version('DEV')
  .help()
  .parse(process.argv.slice(1));

const ansiToHtmlConverter = new AnsiToHtmlConverter();

const DEFAULT_PORT = (process.env.PORT || 3000) as number;

let shutdownElectron: (() => void) | undefined = undefined;

if (isFB) {
  process.env.FLIPPER_FB = 'true';
}

if (argv['default-plugins'] === true) {
  delete process.env.FLIPPER_NO_DEFAULT_PLUGINS;
} else if (argv['default-plugins'] === false) {
  process.env.FLIPPER_NO_DEFAULT_PLUGINS = 'true';
}

if (argv['bundled-plugins'] === true) {
  delete process.env.FLIPPER_NO_BUNDLED_PLUGINS;
} else if (argv['bundled-plugins'] === false) {
  process.env.FLIPPER_NO_BUNDLED_PLUGINS = 'true';
}

if (argv['rebuild-plugins'] === false) {
  process.env.FLIPPER_NO_REBUILD_PLUGINS = 'true';
} else if (argv['rebuild-plugins'] === true) {
  delete process.env.FLIPPER_NO_REBUILD_PLUGINS;
}

if (argv['fast-refresh'] === true) {
  process.env.FLIPPER_FAST_REFRESH = 'true';
} else if (argv['fast-refresh'] === false) {
  delete process.env.FLIPPER_FAST_REFRESH;
}

if (argv['public-build'] === true) {
  // we use a separate env var for forced_public builds, since
  // FB_FLIPPER / isFB reflects whether we are running on FB sources / infra
  // so changing that will not give the desired result (e.g. incorrect resolve paths, yarn installs)
  // this variable purely overrides whether imports are from `fb` or `fb-stubs`
  console.log('🐬 Emulating open source build of Flipper');
  process.env.FLIPPER_FORCE_PUBLIC_BUILD = 'true';
} else if (argv['public-build'] === false) {
  delete process.env.FLIPPER_FORCE_PUBLIC_BUILD;
}

// By default plugin marketplace is disabled in dev mode,
// but it is possible to enable it using this command line
// argument or env var.
if (argv['plugin-marketplace'] === true) {
  delete process.env.FLIPPER_NO_PLUGIN_MARKETPLACE;
} else {
  process.env.FLIPPER_NO_PLUGIN_MARKETPLACE = 'true';
}

if (argv['plugin-auto-update-interval']) {
  process.env.FLIPPER_PLUGIN_AUTO_UPDATE_POLLING_INTERVAL = `${argv['plugin-auto-update-interval']}`;
}

// Force participating in all GKs. Mostly intersting for Flipper team members.
if (argv['enable-all-gks'] === true) {
  process.env.FLIPPER_ENABLE_ALL_GKS = 'true';
}

if (argv['enabled-plugins'] !== undefined) {
  process.env.FLIPPER_ENABLED_PLUGINS = argv['enabled-plugins'].join(',');
}

if (argv.channel !== undefined) {
  process.env.FLIPPER_RELEASE_CHANNEL = argv.channel;
}

if (argv['force-version']) {
  process.env.FLIPPER_FORCE_VERSION = argv['force-version'];
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

function launchElectron(port: number) {
  const entry = process.env.FLIPPER_FAST_REFRESH ? 'init-fast-refresh' : 'init';
  const devServerURL = `http://localhost:${port}`;
  const bundleURL = `http://localhost:${port}/app/src/${entry}.bundle?platform=web&dev=true&minify=false`;
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
    cacheVersion: process.env.FLIPPER_FORCE_PUBLIC_BUILD,
  });
  const connectMiddleware = await Metro.createConnectMiddleware(config);
  app.use(connectMiddleware.middleware);
  connectMiddleware.attachHmrServer(server);
}

function startAssetServer(
  port: number,
): Promise<{app: Express; server: http.Server}> {
  const app = express();

  app.use((req, _res, next) => {
    if (knownErrors[req.url] != null) {
      delete knownErrors[req.url];
      outputScreen();
    }
    next();
  });

  app.use((_req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  });

  app.post('/_restartElectron', (_req, res) => {
    if (shutdownElectron) {
      shutdownElectron();
    }
    shutdownElectron = launchElectron(port);
    res.end();
  });

  app.get('/', (_req, res) => {
    fs.readFile(path.join(staticDir, 'index.dev.html'), (_err, content) => {
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
  const io = require('socket.io')(server); // 3.1.0 socket.io doesn't have type definitions

  // notify connected clients that there's errors in the console
  io.on('connection', (client: any) => {
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
      ['app', 'pkg', 'doctor', 'plugin-lib', 'flipper-plugin'].map((dir) =>
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
    await startWatchPlugins(() => {
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
    // eslint-disable-next-line flipper/no-console-error-without-context
    console.error(errorScreen);

    // notify live clients of errors
    socket?.emit('hasErrors', ansiToHtmlConverter.toHtml(errorScreen));
  } else {
    // eslint-disable-next-line no-console
    console.log(chalk.green('✔ No known errors'));
  }
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

(async () => {
  checkDevServer();
  await prepareDefaultPlugins(
    process.env.FLIPPER_RELEASE_CHANNEL === 'insiders',
  );
  await ensurePluginFoldersWatchable();
  const port = await detect(DEFAULT_PORT);
  const {app, server} = await startAssetServer(port);
  const socket = await addWebsocket(server);
  await startMetroServer(app, server);
  outputScreen(socket);
  await compileMain();
  if (dotenv && dotenv.parsed) {
    console.log('✅  Loaded env vars from .env file: ', dotenv.parsed);
  }
  shutdownElectron = launchElectron(port);
})();
