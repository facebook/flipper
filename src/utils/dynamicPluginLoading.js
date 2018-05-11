/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import electron from 'electron';

const DP_ARG = '--dynamicPlugins=';
/* Sometimes remote objects are missing intermittently. To reduce the chance of
 * this being a problem while in use. Only read it once at startup.
 * https://github.com/electron/electron/issues/8205 */
const _argv = electron.remote.process.argv;
const _loadsDynamicPlugins =
  _argv.findIndex(arg => arg.startsWith(DP_ARG)) > -1;
const _isProduction = !/node_modules[\\/]electron[\\/]/.test(
  electron.remote.process.execPath,
);

export function isProduction(): boolean {
  return _isProduction;
}

export function loadsDynamicPlugins(): boolean {
  return _loadsDynamicPlugins;
}

export function toggleDynamicPluginLoading() {
  const args = _argv.filter(arg => !arg.startsWith(DP_ARG));
  if (!loadsDynamicPlugins()) {
    args.push(DP_ARG + '~/fbsource/xplat/sonar/src/plugins');
  }
  const {app} = electron.remote;
  app.relaunch({args: args.slice(1).concat(['--relaunch'])});
  app.exit(0);
}

export function dynamicPluginPath(): ?string {
  const index = _argv.findIndex(arg => arg.startsWith(DP_ARG));

  if (index > -1) {
    return _argv[index].replace(DP_ARG, '');
  } else {
    null;
  }
}
