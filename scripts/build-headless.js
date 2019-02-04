/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const path = require('path');
const lineReplace = require('line-replace');
const {exec: createBinary} = require('pkg');
const {buildFolder, compile} = require('./build-utils.js');

function preludeBundle(dir) {
  return new Promise((resolve, reject) =>
    lineReplace({
      file: path.join(dir, 'bundle.js'),
      line: 1,
      text:
        'var __DEV__=false; global.electronRequire = require; global.performance = require("perf_hooks").performance;',
      addNewLine: true,
      callback: resolve,
    }),
  );
}

(async () => {
  const targets = [];
  let platformPostfix;

  if (process.argv.indexOf('--mac') > -1) {
    targets.push('node10-macos-x64');
    platformPostfix = '-macos';
  }
  if (process.argv.indexOf('--linux') > -1) {
    targets.push('node10-linux-x64');
    platformPostfix = '-linux';
  }
  if (process.argv.indexOf('--win') > -1) {
    targets.push('node10-win-x64');
    platformPostfix = '-win';
  }
  if (targets.length === 0) {
    throw new Error('No targets specified. eg. --mac, --win, or --linux');
  } else if (targets.length > 1) {
    // platformPostfix is automatically added by pkg
    platformPostfix = '';
  }

  process.env.BUILD_HEADLESS = 'true';
  const buildDir = await buildFolder();
  const distDir = path.join(__dirname, '..', 'dist');
  // eslint-disable-next-line no-console
  console.log('Created build directory', buildDir);
  await compile(buildDir, path.join(__dirname, '..', 'headless', 'index.js'));
  await preludeBundle(buildDir);
  await createBinary([
    path.join(buildDir, 'bundle.js'),
    '--output',
    path.join(distDir, `flipper${platformPostfix}`),
    '--targets',
    targets.join(','),
  ]);
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
