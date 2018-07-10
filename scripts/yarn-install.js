/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const glob = require('glob');
const path = require('path');
const {spawn} = require('child_process');
const PACKAGES = ['static', 'src/plugins/*', 'src/fb/plugins/*'];
const WINDOWS = /^win/.test(process.platform);
const YARN_PATH =
  process.argv.length > 2 ? path.join(__dirname, process.argv[2]) : 'yarn' + (WINDOWS ? '.cmd' : '');

Promise.all(
  PACKAGES.map(
    pattern =>
      new Promise((resolve, reject) => {
        glob(
          path.join(__dirname, '..', pattern, 'package.json'),
          (err, matches) => {
            if (err) {
              reject(err);
            } else {
              resolve(matches);
            }
          },
        );
      }),
  ),
)
  .then(packages =>
    Promise.all(
      packages.reduce((acc, cv) => acc.concat(cv), []).map(
        pkg =>
          new Promise(resolve => {
            const cwd = pkg.replace('/package.json', '');
            const yarn = spawn(YARN_PATH, ['--mutex', 'file'], {
              cwd,
            });
            yarn.stderr.on('data', e => console.error(e.toString()));
            yarn.on('close', code => resolve(code));
          }),
      ),
    ),
  )
  // eslint-disable-next-line
  .then(() => console.log('📦  Installed all dependencies!'));
