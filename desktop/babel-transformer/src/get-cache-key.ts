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

let selfChecksum: string | undefined;
function getSelfChecksum() {
  if (!selfChecksum) {
    selfChecksum = fs
      .readFileSync(path.resolve(__dirname, '..', 'lib', 'checksum.txt'))
      .toString();
  }
  return selfChecksum;
}

export default function getCacheKey() {
  const key = [
    getSelfChecksum(),
    ...Object.entries(flipperEnv)
      .sort(([name1, _value1], [name2, _value2]) => name1.localeCompare(name2))
      .map(([name, value]) => `${name}=${value}`),
  ].join('|');
  return key;
}
