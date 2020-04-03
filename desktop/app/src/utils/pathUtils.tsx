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
