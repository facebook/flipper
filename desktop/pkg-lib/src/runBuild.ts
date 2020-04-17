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
  const baseConfig = await Metro.loadConfig();
  const config = Object.assign({}, baseConfig, {
    reporter: {update: () => {}},
    projectRoot: inputDirectory,
    watchFolders: [inputDirectory, ...(await getWatchFolders(inputDirectory))],
    serializer: {
      ...baseConfig.serializer,
      getRunModuleStatement: (moduleID: string) =>
        `module.exports = global.__r(${moduleID}).default;`,
      createModuleIdFactory,
    },
    transformer: {
      ...baseConfig.transformer,
      babelTransformerPath: require.resolve('flipper-babel-transformer'),
    },
  });
  await Metro.runBuild(config, {
    dev: false,
    minify: false,
    resetCache: false,
    sourceMap: true,
    entry,
    out,
  });
}
