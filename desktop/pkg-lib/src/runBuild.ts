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

let metroDir: string | undefined;
const metroDirPromise = getMetroDir().then((dir) => (metroDir = dir));

async function getMetroDir() {
  let dir = __dirname;
  while (true) {
    const dirToCheck = path.join(dir, 'node_modules', 'metro');
    if (await fs.pathExists(dirToCheck)) return dirToCheck;
    const nextDir = path.dirname(dir);
    if (!nextDir || nextDir === '' || nextDir === dir) {
      break;
    }
    dir = nextDir;
  }
  return __dirname;
}

export default async function runBuild(
  inputDirectory: string,
  entry: string,
  out: string,
  dev: boolean,
) {
  const sourceMapUrl = null; // inline source map
  const baseConfig = await Metro.loadConfig();
  const config = Object.assign({}, baseConfig, {
    reporter: {update: () => {}},
    projectRoot: inputDirectory,
    watchFolders: [metroDir || (await metroDirPromise)].concat(
      await getWatchFolders(inputDirectory),
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
      },
    },
    resolver: {
      ...baseConfig.resolver,
      resolverMainFields: ['flipperBundlerEntry', 'module', 'main'],
      sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'],
      blacklistRE: /\.native\.js$/,
    },
  });
  await Metro.runBuild(config, {
    dev,
    minify: !dev,
    resetCache: !dev,
    sourceMap: dev,
    sourceMapUrl,
    entry,
    out,
  });
}
