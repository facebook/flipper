/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const path = require('path');
const lineReplace = require('line-replace');
const fs = require('fs-extra');
const {
  buildFolder,
  compile,
  compileDefaultPlugins,
} = require('./build-utils.js');

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

function copyFolder(dir) {
  const buildDir = path.join(__dirname, '..', 'dist');
  fs.removeSync(buildDir);
  fs.copySync(dir, buildDir);
}

(async () => {
  process.env.BUILD_HEADLESS = 'true';
  const dir = await buildFolder();
  // eslint-disable-next-line no-console
  console.log('Created build directory', dir);
  await compile(dir, path.join(__dirname, '..', 'headless', 'index.js'));
  await preludeBundle(dir);
  await compileDefaultPlugins(dir);
  copyFolder(dir);
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
