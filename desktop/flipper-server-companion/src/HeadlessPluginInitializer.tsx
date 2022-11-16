/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ActivatablePluginDetails, InstalledPluginDetails} from 'flipper-common';
import {
  AbstractPluginInitializer,
  getRenderHostInstance,
  isSandyPlugin,
} from 'flipper-frontend-core';
import {_SandyPluginDefinition} from 'flipper-plugin-core';

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
    const requiredPlugin = await getRenderHostInstance().requirePlugin(
      pluginDetails.entry,
    );
    if (!requiredPlugin || !requiredPlugin.plugin) {
      throw new Error(
        `Failed to obtain plugin source for: ${pluginDetails.name}`,
      );
    }
    return new _SandyPluginDefinition(pluginDetails, requiredPlugin.plugin);
  }

  protected async filterAllLocalVersions(
    allLocalVersions: InstalledPluginDetails[],
  ): Promise<ActivatablePluginDetails[]> {
    const pluginsToLoad = await super.filterAllLocalVersions(allLocalVersions);
    return pluginsToLoad
      .filter(isSandyPlugin)
      .filter((plugin) => plugin.headless);
  }

  async installPlugin(
    plugin: InstalledPluginDetails,
  ): Promise<_SandyPluginDefinition | undefined> {
    const loaded = await this.loadPlugins([plugin]);
    this._initialPlugins.push(...loaded);

    if (loaded.length > 0) {
      return loaded.at(0);
    }
  }
}
