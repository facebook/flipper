/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import chalk from 'chalk';
import {Express} from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import socketio from 'socket.io';
import {getWatchFolders} from 'flipper-pkg-lib';
import Metro from 'metro';
import pFilter from 'p-filter';
// provided by Metro
// eslint-disable-next-line
import MetroResolver from 'metro-resolver';

const uiSourceDirs = [
  'flipper-ui-browser',
  'flipper-ui-core',
  'flipper-plugin',
  'flipper-common',
];

const stubModules = new Set([
  'fs',
  'path',
  'crypto',
  'process',
  'os',
  'util',
  'child_process',
  'assert',
  'adbkit', // TODO: factor out!
  'zlib',
  'events',
  'fs-extra',
  'archiver',
  'graceful-fs',
  'stream',
  'url',
  'node-fetch',
  'net',
  'vm',
  'debug',
  'lockfile',
  'constants',
  'https',
  'plugin-lib', // TODO: we only want the types?
  'flipper-plugin-lib',
  'tar',
  'minipass',
  'live-plugin-manager',
  'decompress-tar',
  'readable-stream',
  'archiver-utils',
  'metro',
  'decompress',
  'temp',
  'tmp',
  'promisify-child-process',
  'jsdom',
  'extract-zip',
  'yauzl',
  'fd-slicer',
  'envinfo',
  'bser',
  'fb-watchman',
  // TODO fix me
]);

// This file is heavily inspired by scripts/start-dev-server.ts!
export async function startWebServerDev(
  app: Express,
  server: http.Server,
  socket: socketio.Server,
  rootDir: string,
) {
  //   await prepareDefaultPlugins(
  //     process.env.FLIPPER_RELEASE_CHANNEL === 'insiders',
  //   );
  //   await ensurePluginFoldersWatchable();
  await startMetroServer(app, server, socket, rootDir);
  //   await compileMain();
  //   if (dotenv && dotenv.parsed) {
  //     console.log('✅  Loaded env vars from .env file: ', dotenv.parsed);
  //   }
  //   shutdownElectron = launchElectron(port);

  // Refresh the app on changes.
  // When Fast Refresh enabled, reloads are performed by HMRClient, so don't need to watch manually here.
  //   if (!process.env.FLIPPER_FAST_REFRESH) {
  //     await startWatchChanges(io);
  //   }

  console.log('DEV webserver started.');
}

async function startMetroServer(
  app: Express,
  server: http.Server,
  socket: socketio.Server,
  rootDir: string,
) {
  const babelTransformationsDir = path.resolve(
    rootDir,
    'babel-transformer',
    'src',
  );
  const watchFolders = await dedupeFolders(
    (
      await Promise.all(
        uiSourceDirs.map((dir) => getWatchFolders(path.resolve(rootDir, dir))),
      )
    ).flat(),
  );

  const baseConfig = await Metro.loadConfig();
  const config = Object.assign({}, baseConfig, {
    projectRoot: rootDir,
    watchFolders,
    transformer: {
      ...baseConfig.transformer,
      babelTransformerPath: path.join(
        babelTransformationsDir,
        'transform-browser',
      ),
    },
    resolver: {
      ...baseConfig.resolver,
      resolverMainFields: ['flipperBundlerEntry', 'browser', 'module', 'main'],
      blacklistRE: [/\.native\.js$/],
      sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'],
      resolveRequest(context: any, moduleName: string, ...rest: any[]) {
        if (stubModules.has(moduleName)) {
          // console.warn("Found reference to ", moduleName)
          return {
            type: 'empty',
          };
        }
        // if (moduleName.includes('pluginPaths')) {
        //   console.error('got ' + moduleName, rest);
        // }
        return MetroResolver.resolve(
          {
            ...context,
            resolveRequest: null,
          },
          moduleName,
          ...rest,
        );
      },
    },
    watch: true,
    // only needed when medling with babel transforms
    // cacheVersion: Math.random(), // only cache for current run
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
