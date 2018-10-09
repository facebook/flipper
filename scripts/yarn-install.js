/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const path = require('path');
const util = require('util');
const glob = util.promisify(require('glob'));
const exec = util.promisify(require('child_process').exec);
const PACKAGES = [
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

Promise.all(
  PACKAGES.map(pattern =>
    glob(path.join(__dirname, '..', pattern, 'package.json')),
  ),
)
  .then(async packages => {
    packages = packages.reduce((acc, cv) => acc.concat(cv), []);
    console.log(`Installing dependencies for ${packages.length} plugins`);
    for (const pkg of packages) {
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
