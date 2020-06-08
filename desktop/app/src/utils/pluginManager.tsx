/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {homedir} from 'os';
import {PluginMap, PluginDetails} from 'flipper-plugin-lib';
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
      async (currentPlugin: PluginDetails): Promise<[string, UpdateResult]> =>
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
