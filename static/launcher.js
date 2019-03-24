/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const os = require('os');
const fs = require('fs');
const {spawn} = require('child_process');

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

const startLauncher = argv => {
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

/**
 * Runs the launcher if required and returns a boolean based on whether
 * it has. You should shut down this instance of the app in that case.
 */
module.exports = function delegateToLauncher(argv) {
  if (argv.launcher && isProduction() && isLauncherInstalled()) {
    console.warn('Delegating to Flipper Launcher ...');
    console.warn(
      `You can disable this behavior by passing '--no-launcher' at startup.`,
    );
    startLauncher(argv);
    return true;
  }

  return false;
};
