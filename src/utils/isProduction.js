/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import electron from 'electron';

const _isProduction = !/node_modules[\\/]electron[\\/]/.test(
  electron.remote.process.execPath,
);

export default function isProduction(): boolean {
  return _isProduction;
}
