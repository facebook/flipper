/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// We use sync access once per startup.
/* eslint-disable node/no-sync */

import path from 'path';
import fs from 'fs';

import config from '../fb-stubs/config';
import {getRenderHostInstance} from '../RenderHost';

export function getStaticPath(
  relativePath: string = '.',
  {asarUnpacked}: {asarUnpacked: boolean} = {asarUnpacked: false},
) {
  const staticDir = getRenderHostInstance().paths.staticPath;
  const absolutePath = path.resolve(staticDir, relativePath);
  // Unfortunately, path.resolve, fs.pathExists, fs.read etc do not automatically work with asarUnpacked files.
  // All these functions still look for files in "app.asar" even if they are unpacked.
  // Looks like automatic resolving for asarUnpacked files only work for "child_process" module.
  // So we're using a hack here to actually look to "app.asar.unpacked" dir instead of app.asar package.
  return asarUnpacked
    ? absolutePath.replace('app.asar', 'app.asar.unpacked')
    : absolutePath;
}

export function getChangelogPath() {
  const changelogPath = getStaticPath(config.isFBBuild ? 'facebook' : '.');
  if (fs.existsSync(changelogPath)) {
    return changelogPath;
  } else {
    throw new Error('Changelog path path does not exist: ' + changelogPath);
  }
}
