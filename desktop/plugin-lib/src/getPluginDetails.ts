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
import PluginDetails from './PluginDetails';
import {pluginCacheDir} from './pluginPaths';

export default async function (
  pluginDir: string,
  packageJson?: any,
): Promise<PluginDetails> {
  packageJson =
    packageJson || (await fs.readJson(path.join(pluginDir, 'package.json')));
  const specVersion =
    packageJson.$schema &&
    packageJson.$schema ===
      'https://fbflipper.com/schemas/plugin-package/v2.json'
      ? 2
      : 1;
  switch (specVersion) {
    case 1:
      return await getPluginDetailsV1(pluginDir, packageJson);
    case 2:
      return await getPluginDetailsV2(pluginDir, packageJson);
    default:
      throw new Error(`Unknown plugin format version: ${specVersion}`);
  }
}

// Plugins packaged using V1 are distributed as sources and compiled in run-time.
async function getPluginDetailsV1(
  pluginDir: string,
  packageJson: any,
): Promise<PluginDetails> {
  return {
    specVersion: 1,
    dir: pluginDir,
    name: packageJson.name,
    version: packageJson.version,
    main: 'dist/bundle.js',
    entry: path.join(
      pluginCacheDir,
      `${packageJson.name}@${packageJson.version || '0.0.0'}.js`,
    ),
    source: packageJson.main,
    id: packageJson.name,
    isDefault: false,
    gatekeeper: packageJson.gatekeeper,
    icon: packageJson.icon,
    title: packageJson.title || packageJson.name,
    description: packageJson.description,
    category: packageJson.category,
    bugs: packageJson.bugs,
  };
}

// Plugins packaged using V2 are pre-bundled, so compilation in run-time is not required for them.
async function getPluginDetailsV2(
  pluginDir: string,
  packageJson: any,
): Promise<PluginDetails> {
  return {
    specVersion: 2,
    dir: pluginDir,
    name: packageJson.name,
    version: packageJson.version,
    main: packageJson.main,
    entry: path.resolve(pluginDir, packageJson.main),
    source: packageJson.flipperBundlerEntry,
    isDefault: false,
    id: packageJson.id || packageJson.name,
    gatekeeper: packageJson.gatekeeper,
    icon: packageJson.icon,
    title:
      packageJson.title || packageJson.id || getTitleFromName(packageJson.name),
    description: packageJson.description,
    category: packageJson.category,
    bugs: packageJson.bugs,
  };
}

function getTitleFromName(name: string) {
  const prefix = 'flipper-plugin-';
  if (name.startsWith(prefix)) {
    return name.substr(prefix.length);
  }
}
