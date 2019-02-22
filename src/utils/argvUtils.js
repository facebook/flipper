/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import electron from 'electron';
import isProduction from './isProduction';

export const isAutoUpdaterEnabled = () =>
  // TODO(T39788540): Centralise config access and avoid parsing multiple times.
  // $FlowFixMe: env is not in the type defs.
  JSON.parse(electron.remote?.process.env.CONFIG || process.env.CONFIG || '{}')
    .updaterEnabled &&
  isProduction() &&
  process.platform === 'darwin';
