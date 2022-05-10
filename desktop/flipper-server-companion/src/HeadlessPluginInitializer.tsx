/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ActivatablePluginDetails,
  BundledPluginDetails,
  InstalledPluginDetails,
} from 'flipper-common';
import {
  AbstractPluginInitializer,
  getRenderHostInstance,
  isSandyPlugin,
} from 'flipper-frontend-core';
import {_SandyPluginDefinition} from 'flipper-plugin';

export class HeadlessPluginInitializer extends AbstractPluginInitializer {
  protected async getFlipperVersion() {
    const config = await getRenderHostInstance().flipperServer.exec(
      'get-config',
    );
    return config.environmentInfo.appVersion;
  }

  protected async requirePluginImpl(
    pluginDetails: ActivatablePluginDetails,
  ): Promise<_SandyPluginDefinition> {
    const plugin = pluginDetails.isBundled
      ? this.defaultPluginsIndex[pluginDetails.name]
      : await getRenderHostInstance().requirePlugin(pluginDetails.entry);
    if (!plugin) {
      throw new Error(
        `Failed to obtain plugin source for: ${pluginDetails.name}`,
      );
    }
    return new _SandyPluginDefinition(pluginDetails, plugin);
  }

  protected async filterAllLocalVersions(
    allLocalVersions: (BundledPluginDetails | InstalledPluginDetails)[],
  ): Promise<ActivatablePluginDetails[]> {
    const pluginsToLoad = await super.filterAllLocalVersions(allLocalVersions);
    return pluginsToLoad
      .filter(isSandyPlugin)
      .filter((plugin) => plugin.headless);
  }
}
