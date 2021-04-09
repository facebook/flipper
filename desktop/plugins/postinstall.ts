/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {execSync} from 'child_process';
import path from 'path';
import fs from 'fs-extra';

async function postinstall() {
  const publicPluginsDir = path.join(__dirname, 'public');
  execSync('yarn install --mutex network:30330', {
    cwd: publicPluginsDir,
    stdio: 'inherit',
  });
  const fbPluginsDir = path.join(__dirname, 'fb');
  if (await fs.pathExists(fbPluginsDir)) {
    execSync('yarn install --mutex network:30330', {
      cwd: fbPluginsDir,
      stdio: 'inherit',
    });
  }
}

postinstall()
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });
