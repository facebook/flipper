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

function hash(string: string) {
  let hash = 0;
  if (string.length === 0) {
    return hash;
  }
  let chr;
  for (let i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}
const fileToIdMap = new Map();
const createModuleIdFactory = () => (filePath: string) => {
  if (filePath === '__prelude__') {
    return 0;
  }
  let id = fileToIdMap.get(filePath);
  if (typeof id !== 'number') {
    id = hash(filePath);
    fileToIdMap.set(filePath, id);
  }
  return id;
};

export default async function runBuild(
  inputDirectory: string,
  entry: string,
  out: string,
) {
  const dev = process.env.NODE_ENV !== 'production';
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
        `module.exports = global.__r(${moduleID}).default;`,
      createModuleIdFactory,
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
      sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs'],
      blacklistRE: /\.native\.js$/,
    },
  });
  await Metro.runBuild(config, {
    dev,
    minify: !dev,
    resetCache: !dev,
    sourceMap: true,
    entry,
    out,
  });
}
