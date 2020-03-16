/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import isProduction from './isProduction';
import processConfig from './processConfig';

export const isAutoUpdaterEnabled = () =>
  processConfig().updaterEnabled &&
  isProduction() &&
  process.platform === 'darwin';
