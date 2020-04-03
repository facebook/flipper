/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * There are some env vars which affect transformations, so the Metro/Babel cache should be invalidated when at least one of them changed.
 *
 * If any issues found with such approach, we can fallback to the implementation which always invalidates caches, but also makes bundling significantly slower:
 * export default function getCacheKey() { return Math.random().toString(36); }
 */

import {default as flipperEnv} from './flipper-env';
import fs from 'fs-extra';
import path from 'path';

let baseHash = '';
const tsbuildinfoPath = path.resolve(__dirname, '..', 'tsconfig.tsbuildinfo');
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
if (fs.pathExistsSync(tsbuildinfoPath)) {
  /**
   * tsconfig.tsbuildinfo is changed each time TS incremental build detects changes and rebuilds the package,
   * so we can use its modification date as cache key to invalidate the cache each time when babel transformations changed.
   */
  baseHash = fs.lstatSync(tsbuildinfoPath).ctime.toUTCString();
} else if (fs.pathExistsSync(packageJsonPath)) {
  /**
   * tsconfig.tsbuildinfo will not exist in case if the package is installed from npm rather than built locally.
   * In such case we should use version of npm package as hash key to invalidate the cache after updates.
   */
  baseHash = fs.readJsonSync(packageJsonPath).version;
}

export default function getCacheKey() {
  return [
    baseHash,
    ...Object.entries(flipperEnv)
      .sort(([name1, _value1], [name2, _value2]) => name1.localeCompare(name2))
      .map(([name, value]) => `${name}=${value}`),
  ].join('|');
}
