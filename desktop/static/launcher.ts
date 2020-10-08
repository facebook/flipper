/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {spawn} from 'child_process';
import xdg from 'xdg-basedir';
import mkdirp from 'mkdirp';

const isProduction = () =>
  !/node_modules[\\/]electron[\\/]/.test(process.execPath);

const isLauncherInstalled = () => {
  if (os.type() == 'Darwin') {
    const receipt = 'com.facebook.flipper.launcher';
    const plistLocation = '/Applications/Flipper.app/Contents/Info.plist';
    return (
      fs.existsSync(plistLocation) &&
      fs.readFileSync(plistLocation).indexOf(receipt) > 0
    );
  }

  return false;
};

const startLauncher = (argv: {file?: string; url?: string}) => {
  const args = [];
  if (argv.file) {
    args.push('--file', argv.file);
  }
  if (argv.url) {
    args.push('--url', argv.url);
  }
  if (os.type() == 'Darwin') {
    spawn('open', ['/Applications/Flipper.app', '--args'].concat(args));
  }
};

const checkIsCycle = async () => {
  const dir = path.join(xdg.cache!, 'flipper');
  const filePath = path.join(dir, 'last-launcher-run');
  // This isn't monotonically increasing, so there's a change we get time drift
  // between the checks, but the worst case here is that we do two roundtrips
  // before this check works.
  const rightNow = Date.now();

  let backThen;
  try {
    backThen = parseInt(
      (await promisify(fs.readFile)(filePath)).toString(),
      10,
    );
  } catch (e) {
    backThen = 0;
  }

  const delta = rightNow - backThen;
  await mkdirp(dir);
  await promisify(fs.writeFile)(filePath, '' + rightNow);

  // If the last startup was less than 5s ago, something's not okay.
  return Math.abs(delta) < 5000;
};

/**
 * Runs the launcher if required and returns a boolean based on whether
 * it has. You should shut down this instance of the app in that case.
 */
export default async function delegateToLauncher(argv: {
  launcher: boolean;
  file?: string;
  url?: string;
}) {
  if (argv.launcher && isProduction() && isLauncherInstalled()) {
    if (await checkIsCycle()) {
      console.error(
        'Launcher cycle detected. Not delegating even though I usually would.',
      );
      return false;
    }

    console.warn('Delegating to Flipper Launcher ...');
    console.warn(
      `You can disable this behavior by passing '--no-launcher' at startup.`,
    );
    startLauncher(argv);
    return true;
  }

  return false;
}
