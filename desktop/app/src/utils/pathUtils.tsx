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

export function getStaticPath() {
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

let _appPath: string | undefined = undefined;
export function getAppPath() {
  if (!_appPath) {
    _appPath = path.join(getStaticPath(), '..');
  }

  return _appPath;
}

export function getChangelogPath() {
  const staticPath = getStaticPath();
  let changelogPath = '';

  if (config.isFBBuild) {
    changelogPath = path.resolve(staticPath, 'facebook');
  } else {
    changelogPath = staticPath;
  }

  if (fs.existsSync(changelogPath)) {
    return changelogPath;
  }

  if (!fs.existsSync(changelogPath)) {
    throw new Error('Changelog path path does not exist: ' + changelogPath);
  }
  return changelogPath;
}
