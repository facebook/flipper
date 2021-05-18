/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs';
import {remote} from 'electron';
import config from '../fb-stubs/config';

let _staticPath = '';

function getStaticDir() {
  if (_staticPath) {
    return _staticPath;
  }
  _staticPath = path.resolve(__dirname, '..', '..', '..', 'static');
  if (fs.existsSync(_staticPath)) {
    return _staticPath;
  }
  if (remote && fs.existsSync(remote.app.getAppPath())) {
    _staticPath = path.join(remote.app.getAppPath());
  }
  if (!fs.existsSync(_staticPath)) {
    throw new Error('Static path does not exist: ' + _staticPath);
  }
  return _staticPath;
}

export function getStaticPath(
  relativePath: string = '.',
  {asarUnpacked}: {asarUnpacked: boolean} = {asarUnpacked: false},
) {
  const staticDir = getStaticDir();
  const absolutePath = path.resolve(staticDir, relativePath);
  // Unfortunately, path.resolve, fs.pathExists, fs.read etc do not automatically work with asarUnpacked files.
  // All these functions still look for files in "app.asar" even if they are unpacked.
  // Looks like automatic resolving for asarUnpacked files only work for "child_process" module.
  // So we're using a hack here to actually look to "app.asar.unpacked" dir instead of app.asar package.
  return asarUnpacked
    ? absolutePath.replace('app.asar', 'app.asar.unpacked')
    : absolutePath;
}

let _appPath: string | undefined = undefined;
export function getAppPath() {
  if (!_appPath) {
    _appPath = getStaticPath('..');
  }

  return _appPath;
}

export function getChangelogPath() {
  const changelogPath = getStaticPath(config.isFBBuild ? 'facebook' : '.');
  if (fs.existsSync(changelogPath)) {
    return changelogPath;
  } else {
    throw new Error('Changelog path path does not exist: ' + changelogPath);
  }
}
