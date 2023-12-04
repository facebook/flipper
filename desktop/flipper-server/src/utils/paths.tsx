/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import os from 'os';
import xdg from 'xdg-basedir';

export const flipperDataFolder = path.resolve(os.homedir(), '.flipper');
export const flipperSettingsFolder = path.resolve(
  ...(xdg.config ? [xdg.config] : [os.homedir(), '.config']),
  'flipper',
);
