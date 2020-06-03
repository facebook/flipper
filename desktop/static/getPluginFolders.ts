/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs-extra';
import expandTilde from 'expand-tilde';
import {homedir} from 'os';

export function getPluginsInstallationFolder(): string {
  return path.join(homedir(), '.flipper', 'thirdparty');
}

export async function getPluginSourceFolders(): Promise<string[]> {
  const pluginFolders: string[] = [];
  if (process.env.FLIPPER_NO_EMBEDDED_PLUGINS === 'true') {
    console.log(
      '🥫  Skipping embedded plugins because "--no-embedded-plugins" flag provided',
    );
    return pluginFolders;
  }
  const flipperConfigPath = path.join(homedir(), '.flipper', 'config.json');
  if (await fs.pathExists(flipperConfigPath)) {
    const config = await fs.readJson(flipperConfigPath);
    if (config.pluginPaths) {
      pluginFolders.push(...config.pluginPaths);
    }
  }
  pluginFolders.push(path.resolve(__dirname, '..', 'plugins'));
  pluginFolders.push(path.resolve(__dirname, '..', 'plugins', 'fb'));
  return pluginFolders.map(expandTilde).filter(fs.existsSync);
}
