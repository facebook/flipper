/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import electron from 'electron';
import isProduction from './isProduction';

export const isAutoUpdaterEnabled = () =>
  // $FlowFixMe: argv is not included in the type defs.
  !electron.remote.process.argv.includes('--no-updater') &&
  isProduction() &&
  process.platform === 'darwin';
