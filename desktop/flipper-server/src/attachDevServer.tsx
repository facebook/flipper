/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import {WebSocketServer} from 'ws';
import pFilter from 'p-filter';
import {homedir} from 'os';
import {BUILTINS, InstalledPluginDetails} from 'flipper-common';
import {isFBBuild} from './fb-stubs/constants';

// This file is heavily inspired by scripts/start-dev-server.ts!
// part of that is done by start-flipper-server-dev (compiling "main"),
// the other part ("renderer") here.

const uiSourceDirs = ['flipper-ui', 'flipper-plugin', 'flipper-common'];

// copied from plugin-lib/src/pluginPaths
export async function getPluginSourceFolders(): Promise<string[]> {
  const pluginFolders: string[] = [];
  const flipperConfigPath = path.join(homedir(), '.flipper', 'config.json');
  if (await fs.pathExists(flipperConfigPath)) {
    const config = await fs.readJson(flipperConfigPath);
    if (config.pluginPaths) {
      pluginFolders.push(...config.pluginPaths);
    }
  }
  pluginFolders.push(path.resolve(__dirname, '..', '..', 'plugins', 'public'));
  pluginFolders.push(path.resolve(__dirname, '..', '..', 'plugins', 'fb'));
  return pFilter(pluginFolders, (p) => fs.pathExists(p));
}

/**
 * Attaches the necessary routing and middleware to observe
 * for local changes and apply them to the running instance.
 * @param app Express app.
 * @param server HTTP server.
 * @param socket Web Socket server.
 * @param rootDir Root directory.
 */
export async function attachDevServer(
  app: Express,
  server: http.Server,
  socket: WebSocketServer,
  rootDir: string,
) {
  const Metro = require('metro');
  // eslint-disable-next-line node/no-extraneous-require
  const MetroResolver = require('metro-resolver');
  const {getWatchFolders, startWatchPlugins} = require('flipper-pkg-lib');

  const babelTransformationsDir = path.resolve(
    rootDir,
    'babel-transformer',
    'lib', // Note: required pre-compiled!
  );

  const stubModules = new Set<string>(BUILTINS);
  if (!stubModules.size) {
    throw new Error('Failed to load list of Node builtins');
  }

  const watchFolders = await dedupeFolders([
    ...(
      await Promise.all(
        uiSourceDirs.map((dir) => getWatchFolders(path.resolve(rootDir, dir))),
      )
    ).flat(),
  ]);

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
        // flipper is special cased, for plugins that we bundle,
        // we want to resolve `impoSrt from 'flipper'` to 'deprecated-exports', which
        // defines all the deprecated exports
        if (moduleName === 'flipper') {
          return MetroResolver.resolve(context, 'deprecated-exports', ...rest);
        }
        // stubbed modules are modules that don't make sense outside a Node / Electron context,
        // like fs, child_process etc etc.
        // UI / plugins using these features should use the corresponding RenderHost api's instead
        // Ideally we'd fail hard on those, but not all plugins are properly converted yet, and some
        // libraries try to require them for feature detection (e.g. jsbase64)
        if (stubModules.has(moduleName)) {
          console.warn(
            `Found a reference to built-in module '${moduleName}', which will be stubbed out. Referer: ${context.originModulePath}`,
          );
          return {
            type: 'empty',
          };
        }
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
  });
  const connectMiddleware = await Metro.createConnectMiddleware(config);
  app.use(connectMiddleware.middleware);
  connectMiddleware.attachHmrServer(server);
  app.use(function (err: any, _req: any, _res: any, next: any) {
    console.error(chalk.red('\n\nCompile error in client bundle\n'), err);
    socket.clients.forEach((client) => {
      client.send(
        JSON.stringify({event: 'hasErrors', payload: err.toString()}),
      );
    });
    next();
  });

  await startWatchPlugins(
    process.env.FLIPPER_RELEASE_CHANNEL === 'insiders',
    isFBBuild && !process.env.FLIPPER_FORCE_PUBLIC_BUILD,
    (changedPlugins: InstalledPluginDetails[]) => {
      socket.clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: 'plugins-source-updated',
            payload: changedPlugins,
          }),
        );
      });
    },
  );

  console.log('DEV webserver started.');
}

async function dedupeFolders(paths: string[]): Promise<string[]> {
  return pFilter(
    paths.filter((value, index, self) => self.indexOf(value) === index),
    (f) => fs.pathExists(f),
  );
}
