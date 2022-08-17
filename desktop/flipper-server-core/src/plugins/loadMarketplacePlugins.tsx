/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, MarketplacePluginDetails} from 'flipper-common';
import {loadAvailablePlugins} from './fb-stubs/pluginMarketplaceAPI';
import isPluginCompatible from './isPluginCompatible';

export function selectCompatibleMarketplaceVersions(
  availablePlugins: MarketplacePluginDetails[],
): MarketplacePluginDetails[] {
  const plugins: MarketplacePluginDetails[] = [];
  for (const plugin of availablePlugins) {
    if (!isPluginCompatible(plugin)) {
      const compatibleVersion =
        plugin.availableVersions?.find(isPluginCompatible) ??
        plugin.availableVersions?.slice(-1).pop();
      if (compatibleVersion) {
        plugins.push({
          ...compatibleVersion,
          availableVersions: plugin?.availableVersions,
        });
      } else {
        plugins.push(plugin);
      }
    } else {
      plugins.push(plugin);
    }
  }
  return plugins;
}

export async function loadMarketplacePlugins(
  flipperServer: FlipperServer,
  marketplaceURL: string,
): Promise<MarketplacePluginDetails[]> {
  const availablePlugins = await loadAvailablePlugins(
    flipperServer,
    marketplaceURL,
  );
  return selectCompatibleMarketplaceVersions(availablePlugins);
}
