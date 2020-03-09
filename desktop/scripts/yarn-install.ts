/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import util from 'util';
import globImport from 'glob';
import {exec as execImport} from 'child_process';
import {exists as existsImport, copyFile} from 'fs';
const glob = util.promisify(globImport);
const exec = util.promisify(execImport);
const exists = util.promisify(existsImport);
const PACKAGES = [
  'headless-tests',
  'static',
  'src/plugins/*',
  'src/fb/plugins/*',
  'src/fb/plugins/layout/*',
];
const WINDOWS = /^win/.test(process.platform);
const YARN_PATH =
  process.argv.length > 2
    ? path.join(__dirname, process.argv[2])
    : 'yarn' + (WINDOWS ? '.cmd' : '');

prepareWatchmanConfig(path.join(__dirname, '..'));
prepareWatchmanConfig(path.join(__dirname, '..', 'static'));

Promise.all(
  PACKAGES.map(pattern =>
    glob(path.join(__dirname, '..', pattern, 'package.json')),
  ),
)
  .then(async packages => {
    const flattenPackages = packages.reduce((acc, cv) => acc.concat(cv), []);
    console.log(
      `Installing dependencies for ${flattenPackages.length} plugins`,
    );
    for (const pkg of flattenPackages) {
      const {stderr} = await exec(
        // This script is itself executed by yarn (as postinstall script),
        // therefore another yarn instance is running, while we are trying to
        // install the plugin dependencies. We are setting a different port
        // for the mutex of this yarn instance to make sure, it is not blocked
        // by the yarn instance which is executing this script. Otherwise this
        // will cause a deadlock.
        [YARN_PATH, '--mutex', 'network:30330'].join(' '),
        {
          cwd: pkg.replace('/package.json', ''),
        },
      );
      if (stderr) {
        console.warn(stderr);
      } else {
        console.log(`Installed dependencies for ${pkg}`);
      }
    }
  })
  // eslint-disable-next-line
  .then(() => console.log('📦  Installed all plugin dependencies!'))
  .catch(err => {
    console.error('❌  Installing plugin dependencies failed.');
    console.error(err);
    process.exit(1);
  });

async function prepareWatchmanConfig(dir: string) {
  const hasGit = exists(path.join(__dirname, '..', '.git'));
  const hasWatchmanConfig = exists(path.join(dir, '.watchmanconfig'));
  if ((await hasGit) && !(await hasWatchmanConfig)) {
    console.log(`Creating .watchmanconfig in ${dir}`);
    await util.promisify(copyFile)(
      path.join(dir, '_watchmanconfig'),
      path.join(dir, '.watchmanconfig'),
    );
  }
}
