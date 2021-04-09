/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
import {getWatchFolders} from 'flipper-pkg-lib';
import {appDir, publicPluginsDir, fbPluginsDir, jsSharedDir} from './paths';
import isFB from './isFB';

/**
 * Flipper references code from below plugins directly. Such directly referenced plugins
 * and their dependencies should be added as watch folders so Metro bundled can resolve them.
 */
const pluginsReferencedDirectlyFromFlipper = [
  path.join(publicPluginsDir, 'navigation'),
  path.join(fbPluginsDir, 'layout', 'sidebar_extensions'),
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
  if (isFB) {
    watchFolders.push(jsSharedDir);
  }
  return watchFolders
    .filter((value, index, self) => self.indexOf(value) === index)
    .filter(fs.pathExistsSync);
}
