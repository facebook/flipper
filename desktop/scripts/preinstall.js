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
const fs = require('fs');
const linkYarnLock = require('./link-lock');

const {exists: existsImport, copyFile: copyFileImport} = require('fs');
const exists = util.promisify(existsImport);
const copyFile = util.promisify(copyFileImport);

const desktopRootDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(desktopRootDir, '..');
const hasGit = exists(path.join(rootDir, '.git'));

async function prepareYarnLock() {
  if (process.env.FLIPPER_FB_YARN_INSTALL) {
    return;
  }
  if (await linkYarnLock()) {
    console.error(`
    ####################################################################################################
    #                                                                                                  #
    #  It looks like the repository has not been configured, most probably because it was just cloned. #
    #  Call to "./bootstrap" script is required to configure a freshly cloned Flipper repository.      #
    #                                                                                                  #
    #  The called yarn command has been aborted and the bootstrap script executed instead of it.       #
    #  Now the repository is configured and you can simply repeat the command again to proceed.        #
    #                                                                                                  #
    ####################################################################################################
    `);
    process.exit(1);
  }
  await fs.promises
    .unlink(path.join(desktopRootDir, 'plugins', 'fb-link'))
    .catch((_) => {});
}

async function prepareWatchmanConfig(dir) {
  const hasWatchmanConfig = exists(path.join(dir, '.watchmanconfig'));
  if ((await hasGit) && !(await hasWatchmanConfig)) {
    console.log(`Creating .watchmanconfig in ${dir}`);
    await copyFile(
      path.join(dir, '_watchmanconfig'),
      path.join(dir, '.watchmanconfig'),
    );
  }
}

async function preinstall() {
  prepareYarnLock();
  prepareWatchmanConfig(rootDir);
  prepareWatchmanConfig(path.join(desktopRootDir, 'static'));
}

preinstall().catch((err) => {
  console.error(err);
  process.exit(1);
});
