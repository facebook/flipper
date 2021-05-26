/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Metro from 'metro';
import getWatchFolders from './getWatchFolders';
import path from 'path';
import fs from 'fs-extra';
import {getInstalledPluginDetails} from 'flipper-plugin-lib';
import {FileStore} from 'metro-cache';
import os from 'os';

let metroDir: string | undefined;
const metroDirPromise = getMetroDir().then((dir) => (metroDir = dir));

// We need to include metro-runtime to the watched folders list because it contains modules which are included into the final bundle.
async function getMetroDir() {
  let dir = __dirname;
  while (true) {
    const dirToCheck = path.join(dir, 'node_modules', 'metro-runtime');
    if (await fs.pathExists(dirToCheck)) return dirToCheck;
    const nextDir = path.dirname(dir);
    if (!nextDir || nextDir === '' || nextDir === dir) {
      break;
    }
    dir = nextDir;
  }
  return __dirname;
}

export default async function bundlePlugin(pluginDir: string, dev: boolean) {
  const stat = await fs.lstat(pluginDir);
  if (!stat.isDirectory()) {
    throw new Error(`Plugin source ${pluginDir} is not a directory.`);
  }
  const packageJsonPath = path.join(pluginDir, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error(
      `package.json is not found in plugin source directory ${pluginDir}.`,
    );
  }
  const plugin = await getInstalledPluginDetails(pluginDir);
  const entry = plugin.source;
  const out = path.resolve(pluginDir, plugin.main);
  await fs.ensureDir(path.dirname(out));

  const sourceMapUrl = null; // inline source map
  const baseConfig = await Metro.loadConfig();
  const config = Object.assign({}, baseConfig, {
    reporter: {update: () => {}},
    projectRoot: pluginDir,
    watchFolders: [metroDir || (await metroDirPromise)].concat(
      await getWatchFolders(pluginDir),
    ),
    serializer: {
      ...baseConfig.serializer,
      getRunModuleStatement: (moduleID: string) =>
        `module.exports = global.__r(${moduleID});`,
    },
    transformer: {
      ...baseConfig.transformer,
      babelTransformerPath: require.resolve('flipper-babel-transformer'),
      minifierPath: require.resolve('metro-minify-terser'),
      minifierConfig: {
        // see: https://www.npmjs.com/package/terser
        keep_fnames: true,
        module: true,
        warnings: true,
        mangle: false,
        compress: false,
      },
    },
    resolver: {
      ...baseConfig.resolver,
      resolverMainFields: ['flipperBundlerEntry', 'module', 'main'],
      sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'],
      blacklistRE: /\.native\.js$/,
    },
    cacheStores: [
      new FileStore({
        root:
          process.env.FLIPPER_METRO_CACHE ??
          path.join(os.tmpdir(), 'metro-cache'),
      }),
    ],
  });
  await Metro.runBuild(config, {
    dev,
    minify: !dev,
    resetCache: false,
    sourceMap: dev,
    sourceMapUrl,
    entry,
    out,
  });
}
