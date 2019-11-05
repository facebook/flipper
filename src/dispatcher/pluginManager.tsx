/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import path from 'path';
import fs from 'fs-extra';
import {homedir} from 'os';
import {
  registerInstalledPlugins,
  PluginMap,
  PluginDefinition,
} from '../reducers/pluginManager';

export const PLUGIN_DIR = path.join(homedir(), '.flipper', 'thirdparty');

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

function refreshInstalledPlugins(store: Store) {
  readInstalledPlugins().then(plugins =>
    store.dispatch(registerInstalledPlugins(plugins)),
  );
}

export default (store: Store, _logger: Logger) => {
  // This needn't happen immediately and is (light) I/O work.
  window.requestIdleCallback(() => {
    refreshInstalledPlugins(store);
  });
};
