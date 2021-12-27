/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import pFilter from 'p-filter';
import {getWatchFolders} from 'flipper-pkg-lib';
import {appDir} from './paths';

export default async function getAppWatchFolders() {
  const getWatchFoldersResults = await Promise.all(
    [appDir].map((dir) => getWatchFolders(dir)),
  );
  const watchFolders = ([] as string[]).concat(...getWatchFoldersResults);
  return pFilter(
    watchFolders.filter((value, index, self) => self.indexOf(value) === index),
    (f) => fs.pathExists(f),
  );
}
