/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import path from 'path';
import lineReplace from 'line-replace';
import yazl from 'yazl';
const {exec: createBinary} = require('pkg');
import {
  buildFolder,
  compileHeadless,
  compileDefaultPlugins,
  getVersionNumber,
  genMercurialRevision,
} from './build-utils';

const PLUGINS_FOLDER_NAME = 'plugins';

function preludeBundle(
  dir: string,
  versionNumber: string,
  buildRevision: string | null,
) {
  const revisionStr =
    buildRevision == null ? '' : `global.__REVISION__="${buildRevision}";`;
  return new Promise(resolve =>
    lineReplace({
      file: path.join(dir, 'bundle.js'),
      line: 1,
      text: `var __DEV__=false; global.electronRequire = require; global.performance = require("perf_hooks").performance;global.__VERSION__="${versionNumber}";${revisionStr}`,
      addNewLine: true,
      callback: resolve,
    }),
  );
}

async function createZip(buildDir: string, distDir: string, targets: string[]) {
  return new Promise(resolve => {
    const zip = new yazl.ZipFile();

    // add binaries for each target
    targets.forEach(target => {
      const binary = `flipper-${target === 'mac' ? 'macos' : target}`;
      zip.addFile(path.join(buildDir, binary), binary);
    });

    // add plugins
    const pluginDir = path.join(buildDir, PLUGINS_FOLDER_NAME);
    fs.readdirSync(pluginDir).forEach(file => {
      zip.addFile(
        path.join(pluginDir, file),
        path.join(PLUGINS_FOLDER_NAME, file),
      );
    });

    // write zip file
    zip.outputStream
      .pipe(fs.createWriteStream(path.join(distDir, 'Flipper-headless.zip')))
      .on('close', resolve);
    zip.end();
  });
}

(async () => {
  const targets: {mac?: string; linux?: string; win?: string} = {};
  let platformPostfix: string = '';
  if (process.argv.indexOf('--mac') > -1) {
    targets.mac = 'node10-macos-x64';
    platformPostfix = '-macos';
  }
  if (process.argv.indexOf('--linux') > -1) {
    targets.linux = 'node10-linux-x64';
    platformPostfix = '-linux';
  }
  if (process.argv.indexOf('--win') > -1) {
    targets.win = 'node10-win-x64';
    platformPostfix = '-win';
  }
  const length = Object.keys(targets).length;
  if (length === 0) {
    throw new Error('No targets specified. eg. --mac, --win, or --linux');
  } else if (length > 1) {
    // platformPostfix is automatically added by pkg
    platformPostfix = '';
  }
  // Compiling all plugins takes a long time. Use this flag for quicker
  // developement iteration by not including any plugins.
  const skipPlugins = process.argv.indexOf('--no-plugins') > -1;

  process.env.BUILD_HEADLESS = 'true';
  const buildDir = await buildFolder();
  const distDir = path.join(__dirname, '..', '..', 'dist');
  // eslint-disable-next-line no-console
  console.log('Created build directory', buildDir);
  await compileHeadless(buildDir);
  const versionNumber = getVersionNumber();
  const buildRevision = await genMercurialRevision();
  await preludeBundle(buildDir, versionNumber, buildRevision);
  await compileDefaultPlugins(
    path.join(buildDir, PLUGINS_FOLDER_NAME),
    skipPlugins,
  );
  await createBinary([
    path.join(buildDir, 'bundle.js'),
    '--output',
    path.join(buildDir, `flipper${platformPostfix}`),
    '--targets',
    Object.values(targets).join(','),
    '--debug',
  ]);
  await createZip(buildDir, distDir, Object.keys(targets));
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
