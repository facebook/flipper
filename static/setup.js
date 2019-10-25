/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

module.exports = function(argv) {
  // ensure .flipper folder and config exist
  const flipperDir = path.join(os.homedir(), '.flipper');
  if (!fs.existsSync(flipperDir)) {
    fs.mkdirSync(flipperDir);
  }

  const configPath = path.join(flipperDir, 'config.json');
  let config = {
    pluginPaths: [],
    disabledPlugins: [],
    lastWindowPosition: {},
  };

  try {
    config = {
      ...config,
      ...JSON.parse(fs.readFileSync(configPath)),
    };
  } catch (e) {
    // file not readable or not parsable, overwrite it with the new config
    console.warn(`Failed to read ${configPath}: ${e}`);
    console.info('Writing new default config.');
    fs.writeFileSync(configPath, JSON.stringify(config));
  }

  // Non-persistent CLI arguments.
  config = {
    ...config,
    updaterEnabled: argv.updater,
    launcherEnabled: argv.launcher,
    launcherMsg: argv.launcherMsg,
  };

  return {config, configPath, flipperDir};
};
