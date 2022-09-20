/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  getSourcePlugins,
  moveInstalledPluginsFromLegacyDir,
  getAllInstalledPluginVersions,
  getAllInstalledPluginsInDir,
} from 'flipper-plugin-lib';
import {InstalledPluginDetails} from 'flipper-common';
import {getStaticPath} from '../utils/pathUtils';

// Load "dynamic" plugins, e.g. those which are either pre-installed (default), installed or loaded from sources (for development).
export async function loadDynamicPlugins(): Promise<InstalledPluginDetails[]> {
  if (process.env.NODE_ENV === 'test') {
    return [];
  }
  await moveInstalledPluginsFromLegacyDir().catch((ex) =>
    console.error(
      'Eror while migrating installed plugins from legacy folder',
      ex,
    ),
  );

  const [installedPlugins, sourcePlugins] = await Promise.all([
    process.env.FLIPPER_NO_PLUGIN_MARKETPLACE
      ? Promise.resolve([])
      : getAllInstalledPluginVersions(),
    getSourcePlugins(),
  ]);

  const defaultPluginsDir = getStaticPath('defaultPlugins', {
    asarUnpacked: true,
  });
  const defaultPlugins = await getAllInstalledPluginsInDir(defaultPluginsDir);
  if (defaultPlugins.length > 0) {
    console.log(
      `✅  Loaded ${defaultPlugins.length} default plugins:\n${defaultPlugins
        .map((x) => `${x.title}@${x.version}`)
        .join('\n')}.`,
    );
  }
  if (installedPlugins.length > 0) {
    console.log(
      `✅  Loaded ${installedPlugins.length} installed plugins:\n${Array.from(
        new Set(installedPlugins.map((x) => `${x.title}@${x.version}`)),
      ).join('\n')}.`,
    );
  }
  if (sourcePlugins.length > 0) {
    console.log(
      `✅  Loaded ${sourcePlugins.length} source plugins:\n${sourcePlugins
        .map((x) => `${x.title} - ${x.dir}`)
        .join('\n')}.`,
    );
  }
  return [...defaultPlugins, ...installedPlugins, ...sourcePlugins];
}
