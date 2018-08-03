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
const PACKAGES = ['static', 'src/plugins/*', 'src/fb/plugins/*'];
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
    for (const pkg of packages.reduce((acc, cv) => acc.concat(cv), [])) {
      const {stderr} = await exec(YARN_PATH, {
        cwd: pkg.replace('/package.json', ''),
      });
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
  });
