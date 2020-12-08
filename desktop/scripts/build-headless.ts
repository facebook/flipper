/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
import lineReplace from 'line-replace';
import yazl from 'yazl';
const {exec: createBinary} = require('pkg');
import {
  buildFolder,
  compileHeadless,
  getVersionNumber,
  genMercurialRevision,
  generatePluginEntryPoints,
} from './build-utils';
import isFB from './isFB';
import {distDir} from './paths';

function preludeBundle(
  dir: string,
  versionNumber: string,
  buildRevision: string | null,
) {
  const revisionStr =
    buildRevision == null ? '' : `global.__REVISION__="${buildRevision}";`;
  return new Promise((resolve) =>
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
  return new Promise((resolve) => {
    const zip = new yazl.ZipFile();

    // add binaries for each target
    targets.forEach((target) => {
      const binary = `flipper-${target === 'mac' ? 'macos' : target}`;
      zip.addFile(path.join(buildDir, binary), binary);
    });

    // write zip file
    zip.outputStream
      .pipe(fs.createWriteStream(path.join(distDir, 'Flipper-headless.zip')))
      .on('close', resolve);
    zip.end();
  });
}

(async () => {
  if (isFB) {
    process.env.FLIPPER_FB = 'true';
  }
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
  process.env.FLIPPER_HEADLESS = 'true';
  const buildDir = await buildFolder();
  // eslint-disable-next-line no-console
  console.log('Created build directory', buildDir);
  await generatePluginEntryPoints();
  await compileHeadless(buildDir);
  const buildNumber = process.argv.join(' ').match(/--version=(\d+)/);
  const patch = buildNumber && buildNumber.length > 0 ? buildNumber[1] : '0';
  const versionNumber = getVersionNumber(parseInt(patch, 10));
  const buildRevision = await genMercurialRevision();
  await preludeBundle(buildDir, versionNumber, buildRevision);
  await createBinary([
    path.join(buildDir, 'bundle.js'),
    '--output',
    path.join(buildDir, `flipper${platformPostfix}`),
    '--targets',
    Object.values(targets).join(','),
    '--debug',
  ]);
  await fs.ensureDir(distDir);
  await createZip(buildDir, distDir, Object.keys(targets));
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
