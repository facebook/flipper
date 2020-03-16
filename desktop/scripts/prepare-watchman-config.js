/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const path = require('path');
const util = require('util');
const {exists: existsImport, copyFile} = require('fs');
const exists = util.promisify(existsImport);

const desktopRootDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(desktopRootDir, '..');
const hasGit = exists(path.join(rootDir, '.git'));

async function prepareWatchmanConfig(dir) {
  const hasWatchmanConfig = exists(path.join(dir, '.watchmanconfig'));
  if ((await hasGit) && !(await hasWatchmanConfig)) {
    console.log(`Creating .watchmanconfig in ${dir}`);
    await util.promisify(copyFile)(
      path.join(dir, '_watchmanconfig'),
      path.join(dir, '.watchmanconfig'),
    );
  }
}

prepareWatchmanConfig(rootDir);
prepareWatchmanConfig(path.join(desktopRootDir, 'static'));
