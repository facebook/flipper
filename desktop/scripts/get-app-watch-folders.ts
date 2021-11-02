/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import pFilter from 'p-filter';
import path from 'path';
import {getWatchFolders} from 'flipper-pkg-lib';
import {appDir, publicPluginsDir, fbPluginsDir} from './paths';

/**
 * Flipper references code from below plugins directly. Such directly referenced plugins
 * and their dependencies should be added as watch folders so Metro bundled can resolve them.
 */
const pluginsReferencedDirectlyFromFlipper = [
  path.join(publicPluginsDir, 'navigation'),
  path.join(fbPluginsDir, 'mobileconfig'),
  path.join(fbPluginsDir, 'watch'),
];

export default async function getAppWatchFolders() {
  const getWatchFoldersResults = await Promise.all(
    [appDir, ...pluginsReferencedDirectlyFromFlipper].map((dir) =>
      getWatchFolders(dir),
    ),
  );
  const watchFolders = ([] as string[]).concat(...getWatchFoldersResults);
  return pFilter(
    watchFolders.filter((value, index, self) => self.indexOf(value) === index),
    (f) => fs.pathExists(f),
  );
}
