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
import pMap from 'p-map';
import {
  PluginDetails,
  getSourcePlugins,
  getInstalledPlugins,
  finishPendingPluginInstallations,
} from 'flipper-plugin-lib';
import os from 'os';
import {getStaticPath} from '../utils/pathUtils';

const pluginCache = path.join(os.homedir(), '.flipper', 'plugins');

// Load "dynamic" plugins, e.g. those which are either installed or loaded from sources for development purposes.
// This opposed to "static" plugins which are already included into Flipper bundle.
export default async function loadDynamicPlugins(): Promise<PluginDetails[]> {
  if (process.env.FLIPPER_FAST_REFRESH) {
    console.log(
      '❌  Skipping loading of dynamic plugins because Fast Refresh is enabled. Fast Refresh only works with bundled plugins.',
    );
    return [];
  }
  try {
    await finishPendingPluginInstallations();
  } catch (err) {
    console.error('❌  Failed to finish pending installations', err);
  }
  const staticPath = getStaticPath();
  const defaultPlugins = new Set<string>(
    (
      await fs.readJson(path.join(staticPath, 'defaultPlugins', 'index.json'))
    ).map((p: any) => p.name) as string[],
  );
  const dynamicPlugins = [
    ...(await getInstalledPlugins()),
    ...(await getSourcePlugins()).filter((p) => !defaultPlugins.has(p.name)),
  ];
  await fs.ensureDir(pluginCache);
  const compilations = pMap(
    dynamicPlugins,
    (plugin) => {
      return loadPlugin(plugin);
    },
    {concurrency: 4},
  );
  const compiledDynamicPlugins = (await compilations).filter(
    (c) => c !== null,
  ) as PluginDetails[];
  console.log('✅  Loaded all plugins.');
  return compiledDynamicPlugins;
}
async function loadPlugin(
  pluginDetails: PluginDetails,
): Promise<PluginDetails | null> {
  const {specVersion, version, entry, name} = pluginDetails;
  if (specVersion > 1) {
    if (await fs.pathExists(entry)) {
      return pluginDetails;
    } else {
      console.error(
        `❌  Plugin ${name} is ignored, because its entry point not found: ${entry}.`,
      );
      return null;
    }
  } else {
    // Try to load cached version of legacy plugin
    const entry = path.join(pluginCache, `${name}@${version || '0.0.0'}.js`);
    if (await fs.pathExists(entry)) {
      console.log(`🥫  Using cached version of legacy plugin ${name}...`);
      return pluginDetails;
    } else {
      console.error(
        `❌  Plugin ${name} is ignored, because it is defined by the unsupported spec v1 and could not be compiled.`,
      );
      return null;
    }
  }
}
