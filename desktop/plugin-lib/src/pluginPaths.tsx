/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {homedir} from 'os';
import fs from 'fs-extra';
import pFilter from 'p-filter';

const flipperDataDir = path.join(homedir(), '.flipper');

export const legacyPluginInstallationDir = path.join(
  flipperDataDir,
  'thirdparty',
);

export const pluginInstallationDir = path.join(
  flipperDataDir,
  'installed-plugins',
);

export const pluginCacheDir = path.join(flipperDataDir, 'plugins');

export async function getPluginSourceFolders(): Promise<string[]> {
  const pluginFolders: string[] = [];
  const flipperConfigPath = path.join(homedir(), '.flipper', 'config.json');
  if (await fs.pathExists(flipperConfigPath)) {
    let config = {pluginPaths: []};
    try {
      config = await fs.readJson(flipperConfigPath);
    } catch (e) {
      console.error('Failed to read local flipper config: ', e);
    }
    if (config.pluginPaths) {
      pluginFolders.push(...config.pluginPaths);
    }
  }
  pluginFolders.push(path.resolve(__dirname, '..', '..', 'plugins', 'public'));
  pluginFolders.push(path.resolve(__dirname, '..', '..', 'plugins', 'fb'));
  return pFilter(pluginFolders, (p) => fs.pathExists(p));
}

export function getPluginInstallationDir(name: string) {
  return path.join(
    pluginInstallationDir,
    getPluginDirNameFromPackageName(name),
  );
}

export function getPluginVersionInstallationDir(
  name: string,
  version: string,
): string {
  return path.join(getPluginInstallationDir(name), version);
}

export function getPluginDirNameFromPackageName(name: string) {
  return name.replace('/', '__');
}
