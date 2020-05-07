/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import isFB from './isFB';
import {execSync} from 'child_process';
import path from 'path';
import {pluginsDir} from './paths';

if (isFB) {
  execSync('yarn install --mutex network:30330', {
    cwd: path.join(pluginsDir, 'fb'),
    stdio: 'inherit',
  });
}
