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
import {
  getSourcePlugins,
  getInstalledPlugins,
  moveInstalledPluginsFromLegacyDir,
  InstalledPluginDetails,
} from 'flipper-plugin-lib';
import {getStaticPath} from '../utils/pathUtils';

// Load "dynamic" plugins, e.g. those which are either installed or loaded from sources for development purposes.
// This opposed to "default" plugins which are included into Flipper bundle.
export default async function loadDynamicPlugins(): Promise<
  InstalledPluginDetails[]
> {
  if (process.env.FLIPPER_FAST_REFRESH) {
    console.log(
      '❌  Skipping loading of dynamic plugins because Fast Refresh is enabled. Fast Refresh only works with bundled plugins.',
    );
    return [];
  }
  await moveInstalledPluginsFromLegacyDir().catch((ex) =>
    console.error(
      'Eror while migrating installed plugins from legacy folder',
      ex,
    ),
  );
  const staticPath = getStaticPath();
  const defaultPlugins = new Set<string>(
    (
      await fs.readJson(path.join(staticPath, 'defaultPlugins', 'index.json'))
    ).map((p: any) => p.name) as string[],
  );
  const [installedPlugins, unfilteredSourcePlugins] = await Promise.all([
    getInstalledPlugins(),
    getSourcePlugins(),
  ]);
  const sourcePlugins = unfilteredSourcePlugins.filter(
    (p) => !defaultPlugins.has(p.name),
  );
  if (installedPlugins.length > 0) {
    console.log(
      `✅  Loaded ${
        installedPlugins.length
      } installed plugins: ${installedPlugins.map((x) => x.title).join(', ')}.`,
    );
  }
  if (sourcePlugins.length > 0) {
    console.log(
      `✅  Loaded ${sourcePlugins.length} source plugins: ${sourcePlugins
        .map((x) => x.title)
        .join(', ')}.`,
    );
  }
  return [...installedPlugins, ...sourcePlugins];
}
