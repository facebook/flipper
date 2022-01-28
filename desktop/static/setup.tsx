/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

const flipperHomeDir = path.join(os.homedir(), '.flipper');
export const configPath = path.join(flipperHomeDir, 'config.json');
export const defaultConfig: Config = {
  pluginPaths: [],
  disabledPlugins: [],
  darkMode: 'light',
};

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
  darkMode: 'system' | 'light' | 'dark';
};

const ensureConfigDirExists = async (path: fs.PathLike) => {
  try {
    await fs.promises.access(path);
  } catch (e) {
    console.warn('Config directory not found, creating config directory.');
    try {
      await fs.promises.mkdir(path);
    } catch (e) {
      console.error('Failed to create config directory', e);
    }
  }
};

const readConfigFile = async (configPath: fs.PathLike) => {
  let config = defaultConfig;

  try {
    config = {
      ...config,
      ...JSON.parse((await fs.promises.readFile(configPath)).toString()),
    };
  } catch (e) {
    // file not readable or not parsable, overwrite it with the new config
    console.warn(`Failed to read ${configPath}: ${e}`);
    console.info('Writing new default config.');
    await fs.promises.writeFile(configPath, JSON.stringify(config));
  }
  return config;
};

export default async function setup(argv: any) {
  // ensure .flipper folder and config exist
  await ensureConfigDirExists(flipperHomeDir);

  let config = await readConfigFile(configPath);

  // Non-persistent CLI arguments.
  config = {
    ...config,
    darkMode:
      typeof config.darkMode === 'boolean'
        ? config.darkMode // normalise darkmode from old format
          ? 'dark'
          : 'light'
        : config.darkMode,
    updaterEnabled: argv.updater,
    launcherEnabled: argv.launcher,
    launcherMsg: argv.launcherMsg,
  };

  return config;
}
