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
import {default as algoliasearch, SearchIndex} from 'algoliasearch';
import NpmApi, {Package} from 'npm-api';
import semver from 'semver';

const ALGOLIA_APPLICATION_ID = 'OFCNCOG2CU';
const ALGOLIA_API_KEY = 'f54e21fa3a2a0160595bb058179bfb1e';

export const PLUGIN_DIR = path.join(homedir(), '.flipper', 'thirdparty');

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
      (name) =>
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
          .catch((err) => [currentPlugin.name, {kind: 'error', error: err}]),
    ),
  );
}
