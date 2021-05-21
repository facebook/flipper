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
import {getPluginSourceFolders} from './pluginPaths';
import pmap from 'p-map';
import pfilter from 'p-filter';
import {satisfies} from 'semver';
import {getInstalledPluginDetails, isPluginDir} from './getPluginDetails';
import {InstalledPluginDetails} from './PluginDetails';

const flipperVersion = require('../package.json').version;

export async function getSourcePlugins(): Promise<InstalledPluginDetails[]> {
  const pluginFolders = await getPluginSourceFolders();
  const entryPoints: {[key: string]: InstalledPluginDetails} = {};
  const additionalPlugins = await pmap(pluginFolders, (path) =>
    entryPointForPluginFolder(path),
  );
  for (const p of additionalPlugins) {
    Object.keys(p).forEach((key) => {
      entryPoints[key] = p[key];
    });
  }
  const allPlugins = Object.values(entryPoints);
  if (process.env.FLIPPER_ENABLED_PLUGINS) {
    const pluginNames = new Set<string>(
      process.env.FLIPPER_ENABLED_PLUGINS.split(',').map((x) =>
        x.toLowerCase(),
      ),
    );
    return allPlugins.filter(
      (x) =>
        pluginNames.has(x.name) ||
        pluginNames.has(x.id) ||
        pluginNames.has(x.name.replace('flipper-plugin-', '')),
    );
  }
  return allPlugins;
}
async function entryPointForPluginFolder(
  pluginsDir: string,
): Promise<{[key: string]: InstalledPluginDetails}> {
  pluginsDir = expandTilde(pluginsDir);
  if (!fs.existsSync(pluginsDir)) {
    return {};
  }
  return await fs
    .readdir(pluginsDir)
    .then((entries) => entries.map((name) => path.join(pluginsDir, name)))
    .then((entries) => pfilter(entries, isPluginDir))
    .then((packages) =>
      pmap(packages, async (dir) => {
        try {
          const details = await getInstalledPluginDetails(dir);
          if (
            details.flipperSDKVersion &&
            !satisfies(flipperVersion, details.flipperSDKVersion)
          ) {
            console.warn(
              `⚠️ The current Flipper version (${flipperVersion}) doesn't look compatible with the plugin '${details.name}', which expects 'flipper-plugin: ${details.flipperSDKVersion}'`,
            );
          }
          return details;
        } catch (e) {
          console.error(
            `Could not load plugin from "${dir}", because package.json is invalid.`,
            e,
          );
          return null;
        }
      }),
    )
    .then((plugins) => plugins.filter(notNull))
    .then((plugins) =>
      plugins.reduce<{[key: string]: InstalledPluginDetails}>((acc, cv) => {
        acc[cv!.name] = cv!;
        return acc;
      }, {}),
    );
}

function notNull<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
