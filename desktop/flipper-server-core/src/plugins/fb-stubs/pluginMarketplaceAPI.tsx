/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, MarketplacePluginDetails} from 'flipper-common';
import fetch from 'node-fetch';

export async function loadAvailablePlugins(
  server: FlipperServer,
  marketplaceURL: string,
): Promise<MarketplacePluginDetails[]> {
  try {
    const response = await fetch(marketplaceURL);
    const plugins = await response.json();
    return plugins;
  } catch (e) {
    console.error('Failed while retrieving marketplace plugins', e);
    return [];
  }
}
