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
import {homedir} from 'os';
import {PluginMap, PluginDefinition} from '../reducers/pluginManager';
import {PluginManager as PM} from 'live-plugin-manager';
import {default as algoliasearch, SearchIndex} from 'algoliasearch';
import NpmApi, {Package} from 'npm-api';
import semver from 'semver';
import decompress from 'decompress';
import decompressTargz from 'decompress-targz';
import decompressUnzip from 'decompress-unzip';
import tmp from 'tmp';

const ALGOLIA_APPLICATION_ID = 'OFCNCOG2CU';
const ALGOLIA_API_KEY = 'f54e21fa3a2a0160595bb058179bfb1e';

export const PLUGIN_DIR = path.join(homedir(), '.flipper', 'thirdparty');

// TODO(T57014856): The use should be constrained to just this module when the
// refactor is done.
export function providePluginManager(): PM {
  return new PM({
    ignoredDependencies: [/^flipper$/, /^react$/, /^react-dom$/, /^@types/],
  });
}

async function installPlugin(
  name: string,
  installFn: (pluginManager: PM) => Promise<void>,
) {
  await fs.ensureDir(PLUGIN_DIR);
  // create empty watchman config (required by metro's file watcher)
  await fs.writeFile(path.join(PLUGIN_DIR, '.watchmanconfig'), '{}');
  const destinationDir = path.join(PLUGIN_DIR, name);
  // Clean up existing destination files.
  await fs.remove(destinationDir);

  const pluginManager = providePluginManager();
  // install the plugin and all it's dependencies into node_modules
  pluginManager.options.pluginsPath = path.join(destinationDir, 'node_modules');
  await installFn(pluginManager);

  // move the plugin itself out of the node_modules folder
  const pluginDir = path.join(PLUGIN_DIR, name, 'node_modules', name);
  const pluginFiles = await fs.readdir(pluginDir);
  await Promise.all(
    pluginFiles.map(f =>
      fs.move(path.join(pluginDir, f), path.join(pluginDir, '..', '..', f)),
    ),
  );
}

export async function installPluginFromNpm(name: string) {
  await installPlugin(name, pluginManager =>
    pluginManager.install(name).then(() => {}),
  );
}

export async function installPluginFromFile(packagePath: string) {
  const tmpDir = tmp.dirSync().name;
  try {
    const files = await decompress(packagePath, tmpDir, {
      plugins: [decompressTargz(), decompressUnzip()],
    });
    if (!files.length) {
      throw new Error('The package is not in tar.gz format or is empty');
    }

    // npm packages are tar.gz archives containing folder 'package' inside
    const packageDir = path.join(tmpDir, 'package');
    const isNpmPackage = await fs.pathExists(packageDir);

    // vsix packages are zip archives containing folder 'extension' inside
    const extensionDir = path.join(tmpDir, 'extension');
    const isVsix = await fs.pathExists(extensionDir);

    if (!isNpmPackage && !isVsix) {
      throw new Error(
        'Package format is invalid: directory "package" or "extensions" not found in the archive root',
      );
    }

    const packageRoot = isNpmPackage ? packageDir : extensionDir;

    // otherwise both npm and vsix are quite similar, so we can use the same logic for installing them
    const packageJsonPath = path.join(packageRoot, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      throw new Error(
        `Package format is invalid: file "${path.relative(
          tmpDir,
          packageJsonPath,
        )}" not found`,
      );
    }
    const packageJson = await fs.readJSON(packageJsonPath);
    const name = packageJson.name as string;
    await installPlugin(name, pluginManager =>
      pluginManager.installFromPath(packageRoot).then(() => {}),
    );
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.removeSync(tmpDir);
    }
  }
}

// TODO(T57014856): This should be private, too.
export function provideSearchIndex(): SearchIndex {
  const client = algoliasearch(ALGOLIA_APPLICATION_ID, ALGOLIA_API_KEY);
  return client.initIndex('npm-search');
}

export async function readInstalledPlugins(): Promise<PluginMap> {
  const pluginDirExists = await fs.pathExists(PLUGIN_DIR);

  if (!pluginDirExists) {
    return new Map();
  }
  const dirs = await fs.readdir(PLUGIN_DIR);
  const plugins = await Promise.all<[string, PluginDefinition]>(
    dirs.map(
      name =>
        new Promise(async (resolve, reject) => {
          if (!(await fs.lstat(path.join(PLUGIN_DIR, name))).isDirectory()) {
            return resolve(undefined);
          }

          const packageJSON = await fs.readFile(
            path.join(PLUGIN_DIR, name, 'package.json'),
          );

          try {
            resolve([name, JSON.parse(packageJSON.toString())]);
          } catch (e) {
            reject(e);
          }
        }),
    ),
  );
  return new Map(plugins.filter(Boolean));
}

export type UpdateResult =
  | {kind: 'up-to-date'}
  | {kind: 'error'; error: Error}
  | {kind: 'update-available'; version: string};

export async function findPluginUpdates(
  currentPlugins: PluginMap,
): Promise<[string, UpdateResult][]> {
  const npm = new NpmApi();

  return Promise.all(
    Array.from(currentPlugins.values()).map(
      async (
        currentPlugin: PluginDefinition,
      ): Promise<[string, UpdateResult]> =>
        npm
          .repo(currentPlugin.name)
          .package()
          .then((pkg: Package): [string, UpdateResult] => {
            if (semver.lt(currentPlugin.version, pkg.version)) {
              return [
                currentPlugin.name,
                {kind: 'update-available', version: pkg.version},
              ];
            } else {
              return [currentPlugin.name, {kind: 'up-to-date'}];
            }
          })
          .catch(err => [currentPlugin.name, {kind: 'error', error: err}]),
    ),
  );
}
