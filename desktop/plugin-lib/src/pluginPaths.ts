/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {homedir} from 'os';

export const flipperDataDir = path.join(homedir(), '.flipper');

export const pluginInstallationDir = path.join(flipperDataDir, 'thirdparty');

export const pluginPendingInstallationDir = path.join(
  flipperDataDir,
  'pending',
);

export const pluginCacheDir = path.join(flipperDataDir, 'plugins');
