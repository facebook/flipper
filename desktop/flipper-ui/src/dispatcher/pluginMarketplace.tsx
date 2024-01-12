/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {loadAvailablePlugins} from '../fb-stubs/pluginMarketplaceAPI';
import {registerMarketplacePlugins} from '../reducers/plugins';
import {getFlipperLib} from 'flipper-plugin';
import {
  DownloadablePluginDetails,
  MarketplacePluginDetails,
} from 'flipper-common';
import semver from 'semver';
import {startPluginDownload} from '../reducers/pluginDownloads';
import {sideEffect} from '../utils/sideEffect';
import {switchPlugin} from '../reducers/pluginManager';
import {setPluginEnabled} from '../reducers/connections';
import isPluginCompatible from '../utils/isPluginCompatible';
import {selectCompatibleMarketplaceVersions} from './plugins';
import isPluginVersionMoreRecent from '../utils/isPluginVersionMoreRecent';
import {isConnectivityOrAuthError} from 'flipper-common';
import {currentUser} from '../fb-stubs/user';
import {getFlipperServerConfig} from '../flipperServer';
import {GK} from '../utils/GK';

function isAutoUpdateDisabled(store: Store) {
  return (
    // for open-source version auto-updates must be explicitly enabled in Settings
    (!getFlipperLib().isFB &&
      !store.getState().settingsState.enablePluginMarketplaceAutoUpdate) ||
    // for internal build we disable auto-updates in case user is not logged
    (getFlipperLib().isFB && !currentUser().get()) ||
    GK('flipper_disable_plugin_auto_update') ||
    getFlipperServerConfig().env.FLIPPER_NO_PLUGIN_AUTO_UPDATE !== undefined
  );
}

function isPluginMarketplaceDisabled(store: Store) {
  return (
    // for open-source version marketplace must be explicitly enabled in Settings
    (!getFlipperLib().isFB &&
      !store.getState().settingsState.enablePluginMarketplace) ||
    GK('flipper_disable_plugin_marketplace') ||
    getFlipperServerConfig().env.FLIPPER_NO_PLUGIN_MARKETPLACE
  );
}

export default (store: Store) => {
  if (isPluginMarketplaceDisabled(store)) {
    console.warn(
      'Loading plugins from Plugin Marketplace disabled by GK or env var',
    );
    store.dispatch(registerMarketplacePlugins([]));
    return;
  }
  // Run the first refresh immediately and then every time when user is logged
  sideEffect(
    store,
    {
      name: 'refreshMarketplacePluginsWhenUserLogged',
      throttleMs: 1000,
      fireImmediately: true,
    },
    (state) => state.user,
    (_, store) => refreshMarketplacePlugins(store),
  );

  // TODO: provide this value from settings
  const pollingIntervalMs = getFlipperServerConfig().env
    .FLIPPER_PLUGIN_AUTO_UPDATE_POLLING_INTERVAL
    ? parseInt(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        getFlipperServerConfig().env
          .FLIPPER_PLUGIN_AUTO_UPDATE_POLLING_INTERVAL!,
        10,
      ) // for manual testing we could set smaller interval
    : 300000; // 5 min by default

  // Additionally schedule refreshes with the given interval
  const handle = setInterval(
    refreshMarketplacePlugins,
    pollingIntervalMs,
    store,
  );
  // Try to auto-install plugins on every connected / disconnected app
  sideEffect(
    store,
    {
      name: 'autoInstallPluginsOnClientConnected',
      throttleMs: 1000,
      fireImmediately: false,
    },
    (state) => ({
      clients: state.connections.clients,
      pluginsInitialized: state.plugins.initialized,
    }),
    (_, store) =>
      autoUpdatePlugins(store, store.getState().plugins.marketplacePlugins),
  );
  return async () => {
    clearInterval(handle);
  };
};

export async function loadPluginsFromMarketplace(
  store: Store,
): Promise<MarketplacePluginDetails[]> {
  const availablePlugins = await loadAvailablePlugins(store);
  return selectCompatibleMarketplaceVersions(availablePlugins);
}

function logPluginUpdateError(key: string, err: Error) {
  if (isConnectivityOrAuthError(err)) {
    // This is handled elsewhere and we don't need to create another warning or error for it.
    console.warn(
      `Connectivity or auth error while performing Marketplace operation ${key}`,
      err,
    );
  } else {
    console.error(`Error while performing Marketplace operation ${key}`, err);
  }

  throw err;
}

async function refreshMarketplacePlugins(store: Store): Promise<void> {
  if (
    getFlipperLib().isFB &&
    !currentUser().get() &&
    !GK('flipper_use_interngraph_plugin_download')
  ) {
    // inside FB we cannot refresh when user is not logged unless we're using the interngraphg download mechanism
    return;
  }
  // We want to get granular logs here for all of the potential failure points. Hence
  // the slightly awkward try/catch/throw pattern.
  let plugins = [];
  try {
    plugins = await loadPluginsFromMarketplace(store);
  } catch (err) {
    logPluginUpdateError('loadPluginsFromMarketplace', err);
    return;
  }
  try {
    store.dispatch(registerMarketplacePlugins(plugins));
  } catch (err) {
    logPluginUpdateError('registerMarketplacePlugins', err);
    return;
  }
  try {
    autoUpdatePlugins(store, plugins);
  } catch (err) {
    logPluginUpdateError('autoUpdatePlugins', err);
    return;
  }
}

export function autoUpdatePlugins(
  store: Store,
  marketplacePlugins: DownloadablePluginDetails[],
) {
  const state = store.getState();
  if (!state.plugins.initialized) {
    // skip auto-updating plugins if they are not initialized yet
    return;
  }
  const {loadedPlugins, installedPlugins, uninstalledPluginNames} =
    state.plugins;
  const autoInstalledPlugins = new Set<string>();
  for (const client of state.connections.clients.values()) {
    const enabledPlugins = state.connections.enabledPlugins[client.query.app];
    if (enabledPlugins) {
      // If we already have persisted list of enabled plugins -
      // we should install those of them which are enabled, but not installed by some reason.
      enabledPlugins.forEach((p) => {
        if (client.supportsPlugin(p)) {
          autoInstalledPlugins.add(p);
        }
      });
    } else {
      // If there is no persisted list of enabled plugins this means that user
      // opened this app for first time. In such case we should enable and install
      // plugins which are enabled by default.
      for (const plugin of marketplacePlugins) {
        if (plugin.isEnabledByDefault && client.supportsPlugin(plugin.id)) {
          autoInstalledPlugins.add(plugin.id);
          const loadedPluginInstance = state.plugins.clientPlugins.get(
            plugin.id,
          );
          if (loadedPluginInstance) {
            // If plugin was already installed before (e.g. for debugging another mobile app),
            // then we should switch its state to "loaded" for the current app.
            store.dispatch(
              switchPlugin({
                plugin: loadedPluginInstance,
                selectedApp: client.query.app,
              }),
            );
          } else {
            // If plugin was not installed before, then we should mark it as enabled
            // to ensure it is automatically loaded after downloaded from Marketplace.
            store.dispatch(setPluginEnabled(plugin.id, client.query.app));
          }
        }
      }
    }
  }
  if (isAutoUpdateDisabled(store)) {
    return;
  }
  for (const plugin of marketplacePlugins) {
    if (uninstalledPluginNames.has(plugin.name)) {
      // Skip if plugin is marked as uninstalled
      continue;
    }
    if (!isPluginCompatible(plugin)) {
      // Skip if new plugin version is not compatible with the current Flipper version
      continue;
    }
    const loadedPlugin = loadedPlugins.get(plugin.id);
    if (loadedPlugin && !isPluginVersionMoreRecent(plugin, loadedPlugin)) {
      // Skip if plugin is installed and new version is less or equal to the installed one
      continue;
    }
    if (!loadedPlugin && !autoInstalledPlugins.has(plugin.id)) {
      // Skip if plugin is not installed and not in the list of auto-installable plugins
      continue;
    }
    const installedVersion = installedPlugins.get(plugin.name)?.version;
    if (installedVersion && semver.gte(installedVersion, plugin.version)) {
      // Skip if the same or newer version already downloaded
      continue;
    }
    // Finally if we are good to go - dispatch downloading of the updated version
    store.dispatch(startPluginDownload({plugin, startedByUser: false}));
  }
}
