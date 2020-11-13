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

const {exists: existsImport} = require('fs');
const exists = util.promisify(existsImport);

const desktopRootDir = path.resolve(__dirname, '..');
const yarnLockSymlinkPath = path.join(desktopRootDir, 'yarn.lock');
const yarnLockSymlinkTargetPath = path.join(
  desktopRootDir,
  'locks',
  'yarn.lock',
);

async function isYarnLockLinked() {
  if (await exists(yarnLockSymlinkPath)) {
    const target = await fs.promises.realpath(yarnLockSymlinkPath);
    return target == yarnLockSymlinkTargetPath;
  }
  return false;
}

async function linkYarnLock() {
  if (await isYarnLockLinked()) {
    return false;
  }
  await fs.promises.unlink(yarnLockSymlinkPath).catch((_) => {});
  console.log(
    `Pointing ${yarnLockSymlinkPath} to ${yarnLockSymlinkTargetPath}`,
  );
  await fs.promises.symlink(yarnLockSymlinkTargetPath, yarnLockSymlinkPath);
  return true;
}

async function isYarnLockLinkedWindows() {
  if (await exists(yarnLockSymlinkPath)) {
    const [target, source] = await Promise.all([
      fs.promises.readFile(yarnLockSymlinkPath),
      fs.promises.readFile(yarnLockSymlinkTargetPath),
    ]);
    return target.equals(source);
  }
  return false;
}

async function linkYarnLockWindows() {
  if (await isYarnLockLinkedWindows()) {
    return false;
  }
  console.log(`Copying ${yarnLockSymlinkTargetPath} to ${yarnLockSymlinkPath}`);
  await fs.promises.copyFile(
    yarnLockSymlinkTargetPath,
    yarnLockSymlinkPath,
    fs.constants.COPYFILE_FICLONE,
  );
  return true;
}

module.exports =
  process.platform === 'win32' ? linkYarnLockWindows : linkYarnLock;
