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
import {
  getPluginsInstallationFolder,
  getPluginSourceFolders,
} from './getPluginFolders';
import {PluginDetails, getPluginDetails} from 'flipper-plugin-lib';
import pmap from 'p-map';
import pfilter from 'p-filter';

export async function getSourcePlugins(): Promise<PluginDetails[]> {
  return await getPluginsFromFolders(await getPluginSourceFolders());
}
export async function getInstalledPlugins(): Promise<PluginDetails[]> {
  return await getPluginsFromFolders([getPluginsInstallationFolder()]);
}
async function getPluginsFromFolders(
  pluginFolders: string[],
): Promise<PluginDetails[]> {
  const entryPoints: {[key: string]: PluginDetails} = {};
  const additionalPlugins = await pmap(pluginFolders, (path) =>
    entryPointForPluginFolder(path),
  );
  for (const p of additionalPlugins) {
    Object.keys(p).forEach((key) => {
      entryPoints[key] = p[key];
    });
  }
  return Object.values(entryPoints);
}
async function entryPointForPluginFolder(
  pluginsDir: string,
): Promise<{[key: string]: PluginDetails}> {
  pluginsDir = expandTilde(pluginsDir);
  if (!fs.existsSync(pluginsDir)) {
    return {};
  }
  return await fs
    .readdir(pluginsDir)
    .then((entries) =>
      entries.map((name) => ({
        dir: path.join(pluginsDir, name),
        manifestPath: path.join(pluginsDir, name, 'package.json'),
      })),
    )
    .then((entries) =>
      pfilter(entries, ({manifestPath}) => fs.pathExists(manifestPath)),
    )
    .then((packages) =>
      pmap(packages, async ({manifestPath, dir}) => {
        try {
          const manifest = await fs.readJson(manifestPath);
          return {
            dir,
            manifest,
          };
        } catch (e) {
          console.error(
            `Could not load plugin from "${dir}", because package.json is invalid.`,
          );
          console.error(e);
          return null;
        }
      }),
    )
    .then((packages) => packages.filter(notNull))
    .then((packages) => packages.filter(({manifest}) => !manifest.workspaces))
    .then((packages) =>
      packages.filter(({manifest: {keywords, name}}) => {
        if (!keywords || !keywords.includes('flipper-plugin')) {
          console.log(
            `Skipping package "${name}" as its "keywords" field does not contain tag "flipper-plugin"`,
          );
          return false;
        }
        return true;
      }),
    )
    .then((packages) =>
      pmap(packages, async ({manifest, dir}) => {
        try {
          return await getPluginDetails(dir, manifest);
        } catch (e) {
          console.error(
            `Could not load plugin from "${dir}", because package.json is invalid.`,
          );
          console.error(e);
          return null;
        }
      }),
    )
    .then((plugins) => plugins.filter(notNull))
    .then((plugins) =>
      plugins.reduce<{[key: string]: PluginDetails}>((acc, cv) => {
        acc[cv!.name] = cv!;
        return acc;
      }, {}),
    );
}

function notNull<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
