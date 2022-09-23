/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {InstalledPluginDetails} from 'flipper-common';
import pMap from 'p-map';
import path from 'path';
import fs from 'fs-extra';
import runBuild from './runBuild';

const defaultPluginsDir = path.join(__dirname, '../../static/defaultPlugins');

export async function buildDefaultPlugins(
  defaultPlugins: InstalledPluginDetails[],
  dev: boolean,
  intern: boolean,
) {
  if (process.env.FLIPPER_NO_REBUILD_PLUGINS) {
    console.log(
      `⚙️  Including ${
        defaultPlugins.length
      } plugins into the default plugins list. Skipping rebuilding because "no-rebuild-plugins" option provided. List of default plugins: ${defaultPlugins
        .map((p) => p.id)
        .join(', ')}`,
    );
  }
  await pMap(
    defaultPlugins,
    async function (plugin) {
      try {
        if (!process.env.FLIPPER_NO_REBUILD_PLUGINS) {
          console.log(
            `⚙️  Building plugin ${plugin.id} to include it into the default plugins list...`,
          );
          await runBuild(plugin.dir, dev, intern);
        }
        await fs.ensureSymlink(
          plugin.dir,
          path.join(defaultPluginsDir, plugin.name),
          'junction',
        );
      } catch (err) {
        console.error(`✖ Failed to build plugin ${plugin.id}`, err);
      }
    },
    {
      concurrency: 16,
    },
  );
}
