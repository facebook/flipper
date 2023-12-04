/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {MarketplacePluginDetails} from 'flipper-common';
import {Store} from '../reducers/index';

export async function loadAvailablePlugins(
  store: Store,
): Promise<MarketplacePluginDetails[]> {
  const {enablePluginMarketplace, marketplaceURL} =
    store.getState().settingsState;
  try {
    if (!enablePluginMarketplace && !marketplaceURL) {
      throw new Error('Marketplace is not enabled');
    }
    const response = await fetch(marketplaceURL);
    const plugins = await response.json();
    return plugins;
  } catch (e) {
    console.error('Failed while retrieving marketplace plugins', e);
    return [];
  }
}
