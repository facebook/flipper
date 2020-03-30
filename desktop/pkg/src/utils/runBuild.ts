/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Metro from 'metro';
import * as path from 'path';

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
  await Metro.runBuild(
    {
      reporter: {update: () => {}},
      projectRoot: inputDirectory,
      watchFolders: [inputDirectory, path.resolve(__dirname, '..', '..')],
      serializer: {
        getRunModuleStatement: (moduleID: string) =>
          `module.exports = global.__r(${moduleID}).default;`,
        createModuleIdFactory,
      },
      transformer: {
        babelTransformerPath: require.resolve('flipper-babel-transformer'),
      },
    },
    {
      dev: false,
      minify: false,
      resetCache: true,
      sourceMap: true,
      entry,
      out,
    },
  );
}
