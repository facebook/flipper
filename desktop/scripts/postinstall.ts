/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import isFB from './isFB';
import {rootDir, yarnLockPath, yarnLockSymlinkPath} from './paths';
import {execSync} from 'child_process';
import fs from 'fs-extra';

const fbPostinstallScript = './fb/postinstall';

async function postinstall() {
  if (process.platform === 'win32') {
    await fs.copyFile(yarnLockSymlinkPath, yarnLockPath);
  }
  execSync('yarn run afterinstall', {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

async function fbPostinstall() {
  const script = await import(fbPostinstallScript);
  await (script.default || script)();
}

const scriptToExecute = isFB ? fbPostinstall : postinstall;

scriptToExecute().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
