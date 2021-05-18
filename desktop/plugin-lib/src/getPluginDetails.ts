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
import {
  DownloadablePluginDetails,
  InstalledPluginDetails,
  PluginDetails,
} from './PluginDetails';
import {pluginCacheDir} from './pluginPaths';

export function isPluginJson(packageJson: any): boolean {
  return packageJson?.keywords?.includes('flipper-plugin');
}

export async function isPluginDir(dir: string): Promise<boolean> {
  const packageJsonPath = path.join(dir, 'package.json');
  const json = (await fs.pathExists(packageJsonPath))
    ? await fs.readJson(path.join(dir, 'package.json'), {
        throws: false,
      })
    : undefined;
  return isPluginJson(json);
}

export function getPluginDetails(packageJson: any): PluginDetails {
  const specVersion =
    packageJson.$schema &&
    packageJson.$schema ===
      'https://fbflipper.com/schemas/plugin-package/v2.json'
      ? 2
      : 1;
  switch (specVersion) {
    case 1:
      return getPluginDetailsV1(packageJson);
    case 2:
      return getPluginDetailsV2(packageJson);
    default:
      throw new Error(`Unknown plugin format version: ${specVersion}`);
  }
}

export async function getInstalledPluginDetails(
  dir: string,
  packageJson?: any,
): Promise<InstalledPluginDetails> {
  packageJson =
    packageJson ?? (await fs.readJson(path.join(dir, 'package.json')));
  const pluginDetails = getPluginDetails(packageJson);
  const entry =
    pluginDetails.specVersion === 1
      ? path.resolve(
          pluginCacheDir,
          `${packageJson.name}@${packageJson.version || '0.0.0'}.js`,
        )
      : path.resolve(dir, packageJson.main);
  return {
    ...pluginDetails,
    isBundled: false,
    isActivatable: true,
    dir,
    entry,
  };
}

export function getDownloadablePluginDetails(
  packageJson: any,
  downloadUrl: string,
  lastUpdated: Date,
): DownloadablePluginDetails {
  const details = getPluginDetails(packageJson);
  return {
    ...details,
    isBundled: false,
    isActivatable: false,
    downloadUrl,
    lastUpdated,
  };
}

// Plugins packaged using V1 are distributed as sources and compiled in run-time.
function getPluginDetailsV1(packageJson: any): PluginDetails {
  return {
    specVersion: 1,
    name: packageJson.name,
    version: packageJson.version,
    main: 'dist/bundle.js',
    source: packageJson.main,
    id: packageJson.name,
    gatekeeper: packageJson.gatekeeper,
    icon: packageJson.icon,
    title: packageJson.title || packageJson.name,
    description: packageJson.description,
    category: packageJson.category,
    bugs: packageJson.bugs,
    flipperSDKVersion: packageJson?.peerDependencies?.['flipper-plugin'],
    pluginType: packageJson?.pluginType,
    supportedDevices: packageJson?.supportedDevices,
    engines: packageJson.engines,
  };
}

// Plugins packaged using V2 are pre-bundled, so compilation in run-time is not required for them.
function getPluginDetailsV2(packageJson: any): PluginDetails {
  return {
    specVersion: 2,
    name: packageJson.name,
    version: packageJson.version,
    main: packageJson.main,
    source: packageJson.flipperBundlerEntry,
    id: packageJson.id || packageJson.name,
    gatekeeper: packageJson.gatekeeper,
    icon: packageJson.icon,
    title:
      packageJson.title || packageJson.id || getTitleFromName(packageJson.name),
    description: packageJson.description,
    category: packageJson.category,
    bugs: packageJson.bugs,
    flipperSDKVersion: packageJson?.peerDependencies?.['flipper-plugin'],
    pluginType: packageJson?.pluginType,
    supportedDevices: packageJson?.supportedDevices,
    engines: packageJson.engines,
  };
}

function getTitleFromName(name: string): string {
  const prefix = 'flipper-plugin-';
  if (name.startsWith(prefix)) {
    return name.substr(prefix.length);
  }
  return name;
}
