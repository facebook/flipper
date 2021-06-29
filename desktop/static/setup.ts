/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

export type Config = {
  pluginPaths?: string[];
  disabledPlugins?: string[];
  lastWindowPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  updater?: boolean | undefined;
  launcherMsg?: string | undefined;
  updaterEnabled?: boolean;
  launcherEnabled?: boolean;
  darkMode?: boolean;
};

export default function setup(argv: any) {
  // ensure .flipper folder and config exist
  const flipperDir = path.join(os.homedir(), '.flipper');
  if (!fs.existsSync(flipperDir)) {
    fs.mkdirSync(flipperDir);
  }

  const configPath = path.join(flipperDir, 'config.json');
  let config: Config = {
    pluginPaths: [],
    disabledPlugins: [],
  };

  try {
    config = {
      ...config,
      ...JSON.parse(fs.readFileSync(configPath).toString()),
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

  return {config, configPath};
}
