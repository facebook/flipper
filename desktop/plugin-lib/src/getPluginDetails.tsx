/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
import {
  getPluginDetails,
  InstalledPluginDetails,
  isPluginJson,
} from 'flipper-common';
import {pluginCacheDir} from './pluginPaths';

export async function readPluginPackageJson(dir: string): Promise<any> {
  const baseJson = await fs.readJson(path.join(dir, 'package.json'));
  if (await fs.pathExists(path.join(dir, 'fb', 'package.json'))) {
    const addedJson = await fs.readJson(path.join(dir, 'fb', 'package.json'));
    return Object.assign({}, baseJson, addedJson);
  } else {
    return baseJson;
  }
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

export async function getInstalledPluginDetails(
  dir: string,
  packageJson?: any,
): Promise<InstalledPluginDetails> {
  packageJson = packageJson ?? (await readPluginPackageJson(dir));
  const pluginDetails = getPluginDetails(packageJson);
  const [hasOverviewDocs, hasSetupDocs] = await Promise.all([
    pluginDetails.publishedDocs?.overview === undefined
      ? fs.pathExists(path.join(dir, 'docs', 'overview.mdx'))
      : Promise.resolve(pluginDetails.publishedDocs.overview),
    pluginDetails.publishedDocs?.setup === undefined
      ? fs.pathExists(path.join(dir, 'docs', 'setup.mdx'))
      : Promise.resolve(pluginDetails.publishedDocs.setup),
  ]);
  if (hasOverviewDocs || hasSetupDocs) {
    pluginDetails.publishedDocs = {
      overview: hasOverviewDocs,
      setup: hasSetupDocs,
    };
  }
  const entry =
    pluginDetails.specVersion === 1
      ? path.resolve(
          pluginCacheDir,
          `${packageJson.name}@${packageJson.version || '0.0.0'}.js`,
        )
      : path.resolve(dir, packageJson.main);
  const serverAddOnEntry = packageJson.serverAddOn
    ? path.resolve(dir, packageJson.serverAddOn)
    : undefined;
  return {
    ...pluginDetails,
    isBundled: false,
    isActivatable: true,
    dir,
    entry,
    serverAddOnEntry,
  };
}
