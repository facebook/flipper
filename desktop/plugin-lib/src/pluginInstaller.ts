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
import PluginDetails from './PluginDetails';
import {getPluginDetailsFromDir} from './getPluginDetails';
import {
  getPluginInstallationDir,
  getPluginPendingInstallationDir,
  getPluginPendingInstallationsDir,
  pluginInstallationDir,
  pluginPendingInstallationDir,
  getPluginDirNameFromPackageName,
} from './pluginPaths';
import semver from 'semver';

const getTmpDir = promisify(tmp.dir) as () => Promise<string>;

function providePluginManagerNoDependencies(): PM {
  return new PM({ignoredDependencies: [/.*/]});
}

async function installPluginFromTempDir(
  sourceDir: string,
): Promise<PluginDetails> {
  const pluginDetails = await getPluginDetailsFromDir(sourceDir);
  const {name, version} = pluginDetails;
  const backupDir = path.join(await getTmpDir(), `${name}-${version}`);
  const installationsDir = getPluginPendingInstallationsDir(name);
  const destinationDir = getPluginPendingInstallationDir(name, version);

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

    // Cleaning up all the previously downloaded packages, because we've got the newest one.
    const otherPackages = await fs.readdir(installationsDir);
    for (const otherPackage of otherPackages) {
      const otherPackageDir = path.join(installationsDir, otherPackage);
      if (otherPackageDir !== destinationDir) {
        await fs.remove(otherPackageDir);
      }
    }
  } catch (err) {
    // Restore previous version from backup if installation failed
    await fs.remove(destinationDir);
    if (await fs.pathExists(backupDir)) {
      await fs.move(backupDir, destinationDir, {overwrite: true});
    }
    throw err;
  }
  return await getPluginDetailsFromDir(destinationDir);
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
): Promise<PluginDetails | null> {
  const dir = getPluginInstallationDir(name);
  if (!(await fs.pathExists(dir))) {
    return null;
  }
  return await getPluginDetailsFromDir(dir);
}

export async function isPluginPendingInstallation(
  name: string,
  version: string,
) {
  return await fs.pathExists(getPluginPendingInstallationDir(name, version));
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
): Promise<PluginDetails> {
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
  await Promise.all([
    fs.remove(getPluginInstallationDir(name)),
    fs.remove(getPluginPendingInstallationsDir(name)),
  ]);
}

export async function finishPendingPluginInstallations() {
  if (!(await fs.pathExists(pluginPendingInstallationDir))) {
    return;
  }
  try {
    await fs.ensureDir(pluginInstallationDir);
    // create empty watchman config (required by metro's file watcher)
    const watchmanConfigPath = path.join(
      pluginInstallationDir,
      '.watchmanconfig',
    );
    if (!(await fs.pathExists(watchmanConfigPath))) {
      await fs.writeFile(watchmanConfigPath, '{}');
    }
    const pendingPlugins = await fs.readdir(pluginPendingInstallationDir);
    for (const pendingPlugin of pendingPlugins) {
      const pendingInstallationsDir = getPluginPendingInstallationsDir(
        pendingPlugin,
      );
      const pendingVersions = (
        await fs.readdir(pendingInstallationsDir)
      ).sort((v1, v2) => semver.compare(v2, v1, true)); // sort versions in descending order
      if (pendingVersions.length === 0) {
        await fs.remove(pendingInstallationsDir);
        continue;
      }
      const version = pendingVersions[0];
      const pendingInstallation = path.join(pendingInstallationsDir, version);
      const installationDir = getPluginInstallationDir(pendingPlugin);
      const backupDir = path.join(await getTmpDir(), pendingPlugin);
      try {
        if (await fs.pathExists(installationDir)) {
          await fs.move(installationDir, backupDir, {overwrite: true});
        }
        await fs.move(pendingInstallation, installationDir, {overwrite: true});
        await fs.remove(pendingInstallationsDir);
      } catch (err) {
        console.error(
          `Error while finishing pending installation for ${pendingPlugin}`,
          err,
        );
        // in case of error, keep the previously installed version
        await fs.remove(installationDir);
        if (await fs.pathExists(backupDir)) {
          await fs.move(backupDir, installationDir, {overwrite: true});
        }
      } finally {
        await fs.remove(backupDir);
      }
    }
  } catch (err) {
    console.error('Error while finishing plugin pending installations', err);
  }
}
