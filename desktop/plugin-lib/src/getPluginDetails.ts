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
import {PluginDetails} from './PluginDetails';
import {getPluginVersionInstallationDir, pluginCacheDir} from './pluginPaths';

export async function getPluginDetails(pluginDir: string, packageJson: any) {
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

export async function getPluginDetailsFromDir(
  pluginDir: string,
): Promise<PluginDetails> {
  const packageJson = await fs.readJson(path.join(pluginDir, 'package.json'));
  return await getPluginDetails(pluginDir, packageJson);
}

export async function getPluginDetailsFromPackageJson(packageJson: any) {
  const pluginDir = getPluginVersionInstallationDir(
    packageJson.name,
    packageJson.version,
  );
  return await getPluginDetails(pluginDir, packageJson);
}

export async function getDownloadablePluginDetails(
  packageJson: any,
  downloadUrl: string,
  lastUpdated: Date,
) {
  const details = await getPluginDetailsFromPackageJson(packageJson);
  return {
    ...details,
    downloadUrl,
    lastUpdated,
  };
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
    flipperSDKVersion: packageJson?.peerDependencies?.['flipper-plugin'],
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
    flipperSDKVersion: packageJson?.peerDependencies?.['flipper-plugin'],
  };
}

function getTitleFromName(name: string) {
  const prefix = 'flipper-plugin-';
  if (name.startsWith(prefix)) {
    return name.substr(prefix.length);
  }
}
