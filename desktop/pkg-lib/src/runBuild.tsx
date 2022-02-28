/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import stripSourceMapComment from './stripSourceMap';
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

interface RunMetroConfig {
  pluginDir: string;
  baseConfig: any;
  entry: string;
  out: string;
  dev: boolean;
  sourceMapPath?: string;
  babelTransformerPath: string;
}

async function runMetro({
  pluginDir,
  baseConfig,
  entry,
  out,
  dev,
  sourceMapPath,
  babelTransformerPath,
}: RunMetroConfig) {
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
      babelTransformerPath,
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
  const sourceMapUrl = out.replace(/\.js$/, '.map');
  const sourceMap = dev || !!sourceMapPath;
  await Metro.runBuild(config, {
    dev,
    sourceMap,
    sourceMapUrl,
    minify: !dev,
    inlineSourceMap: dev,
    resetCache: false,
    entry,
    out,
  });
  if (sourceMap && !dev) {
    await stripSourceMapComment(out);
  }
  if (
    sourceMapPath &&
    path.resolve(sourceMapPath) !== path.resolve(sourceMapUrl)
  ) {
    console.log(`Moving plugin sourcemap to ${sourceMapPath}`);
    await fs.ensureDir(path.dirname(sourceMapPath));
    await fs.move(sourceMapUrl, sourceMapPath, {overwrite: true});
  }
}

type Options = {
  sourceMapPath?: string | undefined;
  sourceMapPathServerAddOn?: string | undefined;
};

export default async function bundlePlugin(
  pluginDir: string,
  dev: boolean,
  options?: Options,
) {
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
  const baseConfig = await Metro.loadConfig();

  const bundleConfigs: RunMetroConfig[] = [];

  await fs.ensureDir(path.dirname(plugin.entry));
  bundleConfigs.push({
    pluginDir,
    baseConfig,
    entry: plugin.source,
    out: plugin.entry,
    dev,
    sourceMapPath: options?.sourceMapPath,
    babelTransformerPath: require.resolve('flipper-babel-transformer'),
  });

  if (
    plugin.serverAddOnSource &&
    plugin.serverAddOn &&
    plugin.serverAddOnEntry
  ) {
    await fs.ensureDir(path.dirname(plugin.serverAddOnEntry));
    bundleConfigs.push({
      pluginDir,
      baseConfig,
      entry: plugin.serverAddOnSource,
      out: plugin.serverAddOnEntry,
      dev,
      sourceMapPath: options?.sourceMapPathServerAddOn,
      babelTransformerPath: require.resolve(
        'flipper-babel-transformer/lib/transform-server-add-on',
      ),
    });
  }

  await Promise.all(bundleConfigs.map((config) => runMetro(config)));
}
