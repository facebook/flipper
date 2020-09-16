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
import semver from 'semver';
import {
  pluginPendingInstallationDir,
  pluginInstallationDir,
} from './pluginPaths';
import PluginDetails from './PluginDetails';
import getPluginDetails from './getPluginDetails';
import pmap from 'p-map';
import {notNull} from './typeUtils';

export type PluginInstallationStatus =
  | 'not-installed'
  | 'installed'
  | 'pending';

export type InstalledPluginDetails = PluginDetails & {
  installationStatus: PluginInstallationStatus;
};

async function getFullyInstalledPlugins(): Promise<PluginDetails[]> {
  const pluginDirExists = await fs.pathExists(pluginInstallationDir);
  if (!pluginDirExists) {
    return [];
  }
  const dirs = await fs.readdir(pluginInstallationDir);
  const plugins = await pmap(dirs, async (dirName) => {
    const pluginDir = path.join(pluginInstallationDir, dirName);
    if (!(await fs.lstat(pluginDir)).isDirectory()) {
      return undefined;
    }
    try {
      return await getPluginDetails(pluginDir);
    } catch (e) {
      console.error(`Failed to load plugin from ${pluginDir}`, e);
      return undefined;
    }
  });
  return plugins.filter(notNull);
}

async function getPendingInstallationPlugins(): Promise<PluginDetails[]> {
  const pluginDirExists = await fs.pathExists(pluginPendingInstallationDir);
  if (!pluginDirExists) {
    return [];
  }
  const dirs = await fs.readdir(pluginPendingInstallationDir);
  const plugins = await pmap(dirs, async (dirName) => {
    const versions = (
      await fs.readdir(path.join(pluginPendingInstallationDir, dirName))
    ).sort((v1, v2) => semver.compare(v2, v1, true));
    if (versions.length === 0) {
      return undefined;
    }
    const pluginDir = path.join(
      pluginPendingInstallationDir,
      dirName,
      versions[0],
    );
    if (!(await fs.lstat(pluginDir)).isDirectory()) {
      return undefined;
    }
    try {
      return await getPluginDetails(pluginDir);
    } catch (e) {
      console.error(`Failed to load plugin from ${pluginDir}`, e);
      return undefined;
    }
  });
  return plugins.filter(notNull);
}

export async function getInstalledPlugins(): Promise<InstalledPluginDetails[]> {
  const map = new Map<string, InstalledPluginDetails>(
    (await getFullyInstalledPlugins()).map((p) => [
      p.name,
      {...p, installationStatus: 'installed'},
    ]),
  );
  for (const p of await getPendingInstallationPlugins()) {
    if (!map.get(p.name) || semver.gt(p.version, map.get(p.name)!.version)) {
      map.set(p.name, {...p, installationStatus: 'pending'});
    }
  }
  const allPlugins = [...map.values()].sort((p1, p2) =>
    p1.installationStatus === 'installed' && p2.installationStatus === 'pending'
      ? 1
      : p1.installationStatus === 'pending' &&
        p2.installationStatus === 'installed'
      ? -1
      : p1.name.localeCompare(p2.name),
  );
  return allPlugins;
}
