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
import {promisify} from 'util';
import {PluginManager as PM} from 'live-plugin-manager';
import decompress from 'decompress';
import decompressTargz from 'decompress-targz';
import decompressUnzip from 'decompress-unzip';
import tmp from 'tmp';
import {InstalledPluginDetails} from './PluginDetails';
import {getInstalledPluginDetails} from './getPluginDetails';
import {
  getPluginVersionInstallationDir,
  getPluginDirNameFromPackageName,
  getPluginInstallationDir,
  pluginInstallationDir,
  legacyPluginInstallationDir,
} from './pluginPaths';
import pfilter from 'p-filter';
import pmap from 'p-map';
import semver from 'semver';
import {notNull} from './typeUtils';

const getTmpDir = promisify(tmp.dir) as () => Promise<string>;

function providePluginManagerNoDependencies(): PM {
  return new PM({ignoredDependencies: [/.*/]});
}

async function installPluginFromTempDir(
  sourceDir: string,
): Promise<InstalledPluginDetails> {
  const pluginDetails = await getInstalledPluginDetails(sourceDir);
  const {name, version} = pluginDetails;
  const backupDir = path.join(await getTmpDir(), `${name}-${version}`);
  const destinationDir = getPluginVersionInstallationDir(name, version);

  if (pluginDetails.specVersion == 1) {
    throw new Error(
      `Cannot install plugin ${pluginDetails.name} because it is packaged using the unsupported format v1. Please encourage the plugin author to update to v2, following the instructions on https://fbflipper.com/docs/extending/js-setup#migration-to-the-new-plugin-specification`,
    );
  }

  try {
    // Moving the existing destination dir to backup
    if (await fs.pathExists(destinationDir)) {
      await fs.move(destinationDir, backupDir, {overwrite: true});
    }
    await fs.move(sourceDir, destinationDir);
  } catch (err) {
    // Restore previous version from backup if installation failed
    await fs.remove(destinationDir);
    if (await fs.pathExists(backupDir)) {
      await fs.move(backupDir, destinationDir, {overwrite: true});
    }
    throw err;
  }
  return await getInstalledPluginDetails(destinationDir);
}

async function getPluginRootDir(dir: string) {
  // npm packages are tar.gz archives containing folder 'package' inside
  const packageDir = path.join(dir, 'package');
  const isNpmPackage = await fs.pathExists(packageDir);

  // vsix packages are zip archives containing folder 'extension' inside
  const extensionDir = path.join(dir, 'extension');
  const isVsix = await fs.pathExists(extensionDir);

  if (!isNpmPackage && !isVsix) {
    throw new Error(
      'Package format is invalid: directory "package" or "extensions" not found in the archive root',
    );
  }

  return isNpmPackage ? packageDir : extensionDir;
}

export async function getInstalledPlugin(
  name: string,
  version: string,
): Promise<InstalledPluginDetails | null> {
  const dir = getPluginVersionInstallationDir(name, version);
  if (!(await fs.pathExists(dir))) {
    return null;
  }
  return await getInstalledPluginDetails(dir);
}

export async function installPluginFromNpm(name: string) {
  const tmpDir = await getTmpDir();
  try {
    await fs.ensureDir(tmpDir);
    const plugManNoDep = providePluginManagerNoDependencies();
    plugManNoDep.options.pluginsPath = tmpDir;
    await plugManNoDep.install(name);
    const pluginTempDir = path.join(
      tmpDir,
      getPluginDirNameFromPackageName(name),
    );
    await installPluginFromTempDir(pluginTempDir);
  } finally {
    await fs.remove(tmpDir);
  }
}

export async function installPluginFromFile(
  packagePath: string,
): Promise<InstalledPluginDetails> {
  const tmpDir = await getTmpDir();
  try {
    const files = await decompress(packagePath, tmpDir, {
      plugins: [decompressTargz(), decompressUnzip()],
    });
    if (!files.length) {
      throw new Error('The package is not in tar.gz format or is empty');
    }
    const pluginDir = await getPluginRootDir(tmpDir);
    return await installPluginFromTempDir(pluginDir);
  } finally {
    await fs.remove(tmpDir);
  }
}

export async function removePlugin(name: string): Promise<void> {
  await fs.remove(getPluginInstallationDir(name));
}

export async function removePlugins(
  names: IterableIterator<string>,
): Promise<void> {
  await pmap(names, (name) => removePlugin(name));
}

export async function getInstalledPlugins(): Promise<InstalledPluginDetails[]> {
  const versionDirs = await getInstalledPluginVersionDirs();
  return pmap(
    versionDirs
      .filter(([_, versionDirs]) => versionDirs.length > 0)
      .map(([_, versionDirs]) => versionDirs[0]),
    (latestVersionDir) =>
      getInstalledPluginDetails(latestVersionDir).catch((err) => {
        console.error(`Failed to load plugin from ${latestVersionDir}`, err);
        return null;
      }),
  ).then((plugins) => plugins.filter(notNull));
}

export async function cleanupOldInstalledPluginVersions(
  maxNumberOfVersionsToKeep: number,
): Promise<void> {
  const versionDirs = await getInstalledPluginVersionDirs();
  const versionDirsToDelete = versionDirs
    .map(([_, versionDirs]) => versionDirs.slice(maxNumberOfVersionsToKeep))
    .flat();
  await pmap(versionDirsToDelete, (versionDirToDelete) =>
    fs.remove(versionDirToDelete).catch(() => {}),
  );
}

// Before that we installed all plugins to "thirdparty" folder and only kept
// a single version for each of them. Now we install plugins to "installed-plugins"
// folder and keep multiple versions. This function checks if the legacy folder exists and
// moves all the plugins installed there to the new folder.
export async function moveInstalledPluginsFromLegacyDir() {
  if (await fs.pathExists(legacyPluginInstallationDir)) {
    await fs
      .readdir(legacyPluginInstallationDir)
      .then((dirs) =>
        dirs.map((dir) => path.join(legacyPluginInstallationDir, dir)),
      )
      .then((dirs) =>
        pfilter(dirs, (dir) =>
          fs
            .lstat(dir)
            .then((lstat) => lstat.isDirectory())
            .catch(() => false),
        ),
      )
      .then((dirs) =>
        pmap(dirs, (dir) =>
          getInstalledPluginDetails(dir).catch(async (err) => {
            console.error(
              `Failed to load plugin from ${dir} on moving legacy plugins. Removing it.`,
              err,
            );
            fs.remove(dir);
            return null;
          }),
        ),
      )
      .then((plugins) =>
        pmap(plugins.filter(notNull), (plugin) =>
          fs.move(
            plugin.dir,
            getPluginVersionInstallationDir(plugin.name, plugin.version),
            {overwrite: true},
          ),
        ),
      );
    await fs.remove(legacyPluginInstallationDir);
  }
}

type InstalledPluginVersionDirs = [string, string[]][];

async function getInstalledPluginVersionDirs(): Promise<InstalledPluginVersionDirs> {
  if (!(await fs.pathExists(pluginInstallationDir))) {
    return [];
  }
  return await fs
    .readdir(pluginInstallationDir)
    .then((dirs) => dirs.map((dir) => path.join(pluginInstallationDir, dir)))
    .then((dirs) =>
      pfilter(dirs, (dir) =>
        fs
          .lstat(dir)
          .then((lstat) => lstat.isDirectory())
          .catch(() => false),
      ),
    )
    .then((dirs) =>
      pmap(dirs, (dir) =>
        fs
          .readdir(dir)
          .then((versionDirs) => versionDirs.filter((d) => semver.valid(d)))
          .then((versionDirs) =>
            versionDirs.sort((v1, v2) => semver.compare(v2, v1, true)),
          )
          .then((versionDirs) =>
            versionDirs.map((versionDir) => path.join(dir, versionDir)),
          )
          .then((versionDirs) =>
            pfilter(versionDirs, (versionDir) =>
              fs
                .lstat(versionDir)
                .then((lstat) => lstat.isDirectory())
                .catch(() => false),
            ),
          ),
      ).then((allDirs) =>
        allDirs.reduce<InstalledPluginVersionDirs>((agg, versionDirs, i) => {
          agg.push([dirs[i], versionDirs]);
          return agg;
        }, []),
      ),
    );
}
