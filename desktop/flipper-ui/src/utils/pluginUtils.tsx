/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {PluginDefinition} from '../plugin';
import type {State, Store} from '../reducers';
import type {State as PluginsState} from '../reducers/plugins';
import type Client from '../Client';
import type {
  ActivatablePluginDetails,
  ConcretePluginDetails,
  DownloadablePluginDetails,
  PluginDetails,
} from 'flipper-common';
import {getPluginKey} from './pluginKey';
import BaseDevice from '../devices/BaseDevice';
import isPluginVersionMoreRecent from './isPluginVersionMoreRecent';
import isPluginCompatible from './isPluginCompatible';

export type PluginLists = {
  devicePlugins: PluginDefinition[];
  enabledPlugins: PluginDefinition[];
  disabledPlugins: PluginDefinition[];
  unavailablePlugins: [plugin: PluginDetails, reason: string][];
  downloadablePlugins: DownloadablePluginDetails[];
};

export type ActivePluginListItem =
  | {
      status: 'enabled';
      details: ActivatablePluginDetails;
      definition: PluginDefinition;
    }
  | {
      status: 'disabled';
      details: ActivatablePluginDetails;
      definition: PluginDefinition;
    }
  | {
      status: 'uninstalled';
      details: DownloadablePluginDetails;
    }
  | {
      status: 'unavailable';
      details: PluginDetails;
      reason: string;
    };

export type ActivePluginList = Record<string, ActivePluginListItem | undefined>;

export const defaultEnabledBackgroundPlugins = ['Navigation']; // The navigation plugin is enabled always, to make sure the navigation features works

export function pluginsClassMap(
  plugins: PluginsState,
): Map<string, PluginDefinition> {
  return new Map<string, PluginDefinition>([
    ...plugins.clientPlugins.entries(),
    ...plugins.devicePlugins.entries(),
  ]);
}

export function computeExportablePlugins(
  state: Pick<State, 'plugins' | 'connections' | 'pluginMessageQueue'>,
  device: BaseDevice | null,
  client: Client | null,
  availablePlugins: PluginLists,
): {id: string; label: string}[] {
  return [
    ...availablePlugins.devicePlugins.filter((plugin) => {
      return isExportablePlugin(state, device, client, plugin);
    }),
    ...availablePlugins.enabledPlugins.filter((plugin) => {
      return isExportablePlugin(state, device, client, plugin);
    }),
  ].map((p) => ({
    id: p.id,
    label: getPluginTitle(p),
  }));
}

function isExportablePlugin(
  {pluginMessageQueue}: Pick<State, 'pluginMessageQueue'>,
  device: BaseDevice | null,
  client: Client | null,
  plugin: PluginDefinition,
): boolean {
  const pluginKey = isDevicePluginDefinition(plugin)
    ? getPluginKey(undefined, device, plugin.id)
    : getPluginKey(client?.id, undefined, plugin.id);
  // plugin has exportable sandy state
  if (client?.sandyPluginStates.get(plugin.id)?.isPersistable()) {
    return true;
  }
  if (device?.sandyPluginStates.get(plugin.id)?.isPersistable()) {
    return true;
  }
  // plugin has pending messages and a persisted state reducer or isSandy
  if (pluginMessageQueue[pluginKey]) {
    return true;
  }
  // nothing to serialize
  return false;
}

export function getPluginTitle(pluginClass: {
  title?: string | null;
  id: string;
}) {
  return pluginClass.title || pluginClass.id;
}

export function sortPluginsByName(
  a: PluginDefinition,
  b: PluginDefinition,
): number {
  // make sure Device plugins are sorted before normal plugins
  if (isDevicePluginDefinition(a) && !isDevicePluginDefinition(b)) {
    return -1;
  }
  if (isDevicePluginDefinition(b) && !isDevicePluginDefinition(a)) {
    return 1;
  }
  return getPluginTitle(a).toLowerCase() > getPluginTitle(b).toLocaleLowerCase()
    ? 1
    : -1;
}

export function isDevicePlugin(activePlugin: ActivePluginListItem) {
  if (activePlugin.details.pluginType === 'device') {
    return true;
  }
  return (
    (activePlugin.status === 'enabled' || activePlugin.status === 'disabled') &&
    isDevicePluginDefinition(activePlugin.definition)
  );
}

export function isDevicePluginDefinition(
  definition: PluginDefinition,
): boolean {
  return definition.isDevicePlugin;
}

export function getPluginTooltip(details: PluginDetails): string {
  return `${getPluginTitle(details)} (${details.id}@${details.version}) ${
    details.description ?? ''
  }`;
}

export function computePluginLists(
  connections: Pick<
    State['connections'],
    'enabledDevicePlugins' | 'enabledPlugins'
  >,
  plugins: Pick<
    State['plugins'],
    | 'marketplacePlugins'
    | 'loadedPlugins'
    | 'devicePlugins'
    | 'disabledPlugins'
    | 'gatekeepedPlugins'
    | 'failedPlugins'
    | 'clientPlugins'
  >,
  device: BaseDevice | null,
  client: Client | null,
): {
  devicePlugins: PluginDefinition[];
  enabledPlugins: PluginDefinition[];
  disabledPlugins: PluginDefinition[];
  unavailablePlugins: [plugin: PluginDetails, reason: string][];
  downloadablePlugins: DownloadablePluginDetails[];
} {
  const enabledDevicePluginsState = connections.enabledDevicePlugins;
  const enabledPluginsState = connections.enabledPlugins;
  const uninstalledMarketplacePlugins = getLatestCompatibleVersionOfEachPlugin([
    ...plugins.marketplacePlugins,
  ]).filter((p) => !plugins.loadedPlugins.has(p.id));
  const devicePlugins: PluginDefinition[] = [...plugins.devicePlugins.values()]
    .filter((p) => device?.supportsPlugin(p))
    .filter((p) => enabledDevicePluginsState.has(p.id));
  const enabledPlugins: PluginDefinition[] = [];
  const disabledPlugins: PluginDefinition[] = [
    ...plugins.devicePlugins.values(),
  ]
    .filter((p) => device?.supportsPlugin(p.details))
    .filter((p) => !enabledDevicePluginsState.has(p.id));
  const unavailablePlugins: [plugin: PluginDetails, reason: string][] = [];
  const downloadablePlugins: DownloadablePluginDetails[] = [];

  if (device) {
    // find all device plugins that aren't part of the current device
    for (const p of plugins.devicePlugins.values()) {
      if (!device.supportsPlugin(p)) {
        unavailablePlugins.push([
          p.details,
          `Device plugin '${getPluginTitle(
            p.details,
          )}' is not supported by the selected device '${device.title}' (${
            device.os
          })`,
        ]);
      }
    }
    for (const plugin of uninstalledMarketplacePlugins.filter(
      (d) => d.pluginType === 'device',
    )) {
      if (device.supportsPlugin(plugin)) {
        downloadablePlugins.push(plugin);
      }
    }
  } else {
    for (const p of plugins.devicePlugins.values()) {
      unavailablePlugins.push([
        p.details,
        `Device plugin '${getPluginTitle(
          p.details,
        )}' is not available because no device is currently selected`,
      ]);
    }
  }

  // process problematic plugins
  plugins.disabledPlugins.forEach((plugin) => {
    unavailablePlugins.push([
      plugin,
      `Plugin '${plugin.title}' is disabled by configuration`,
    ]);
  });
  plugins.gatekeepedPlugins.forEach((plugin) => {
    unavailablePlugins.push([
      plugin,
      `Plugin '${plugin.title}' is only available to members of gatekeeper '${plugin.gatekeeper}'`,
    ]);
  });
  plugins.failedPlugins.forEach(([plugin, error]) => {
    unavailablePlugins.push([
      plugin,
      `Plugin '${plugin.title}' failed to load: '${error}'`,
    ]);
  });

  const clientPlugins = Array.from(plugins.clientPlugins.values()).sort(
    sortPluginsByName,
  );

  // process all client plugins
  if (device && client) {
    const favoritePlugins = getFavoritePlugins(
      device,
      client,
      clientPlugins,
      client && enabledPluginsState[client.query.app],
      true,
    );
    clientPlugins.forEach((plugin) => {
      if (!client.supportsPlugin(plugin.id)) {
        unavailablePlugins.push([
          plugin.details,
          `Plugin '${getPluginTitle(
            plugin.details,
          )}' is not supported by the selected application '${
            client.query.app
          }' (${client.query.os})`,
        ]);
      } else if (favoritePlugins.includes(plugin)) {
        enabledPlugins.push(plugin);
      } else {
        disabledPlugins.push(plugin);
      }
    });
    uninstalledMarketplacePlugins.forEach((plugin) => {
      if (plugin.pluginType !== 'device' && client.supportsPlugin(plugin.id)) {
        downloadablePlugins.push(plugin);
      }
    });
  } else {
    clientPlugins.forEach((plugin) => {
      unavailablePlugins.push([
        plugin.details,
        `Plugin '${getPluginTitle(
          plugin.details,
        )}' is not available because no application is currently selected`,
      ]);
    });
  }
  const downloadablePluginSet = new Set<string>(
    downloadablePlugins.map((p) => p.id),
  );
  uninstalledMarketplacePlugins
    .filter((p) => !downloadablePluginSet.has(p.id))
    .forEach((plugin) => {
      unavailablePlugins.push([
        plugin,
        `Plugin '${getPluginTitle(plugin)}' is not supported by the selected ${
          plugin.pluginType === 'device' ? 'device' : 'application'
        } '${
          (plugin.pluginType === 'device'
            ? device?.title
            : client?.query.app) ?? 'unknown'
        }' (${
          plugin.pluginType === 'device' ? device?.os : client?.query.os
        }) and not installed in Flipper`,
      ]);
    });

  enabledPlugins.sort(sortPluginsByName);
  devicePlugins.sort(sortPluginsByName);
  disabledPlugins.sort(sortPluginsByName);
  unavailablePlugins.sort(([a], [b]) => {
    return getPluginTitle(a) > getPluginTitle(b) ? 1 : -1;
  });
  downloadablePlugins.sort((a, b) => {
    return getPluginTitle(a) > getPluginTitle(b) ? 1 : -1;
  });

  return {
    devicePlugins,
    enabledPlugins,
    disabledPlugins,
    unavailablePlugins,
    downloadablePlugins,
  };
}

function getFavoritePlugins(
  device: BaseDevice,
  client: Client,
  allPlugins: PluginDefinition[],
  enabledPlugins: undefined | string[],
  returnFavoredPlugins: boolean, // if false, unfavoried plugins are returned
): PluginDefinition[] {
  if (device.isArchived) {
    if (!returnFavoredPlugins) {
      return [];
    }
    // for *imported* devices, all stored plugins are enabled
    return allPlugins.filter((plugin) => client.plugins.has(plugin.id));
  }
  if (!enabledPlugins || !enabledPlugins.length) {
    return returnFavoredPlugins ? [] : allPlugins;
  }
  return allPlugins.filter((plugin) => {
    const idx = enabledPlugins.indexOf(plugin.id);
    return idx === -1 ? !returnFavoredPlugins : returnFavoredPlugins;
  });
}

export function computeActivePluginList({
  enabledPlugins,
  devicePlugins,
  disabledPlugins,
  downloadablePlugins,
  unavailablePlugins,
}: PluginLists) {
  const pluginList: ActivePluginList = {};
  for (const plugin of enabledPlugins) {
    pluginList[plugin.id] = {
      status: 'enabled',
      details: plugin.details,
      definition: plugin,
    };
  }
  for (const plugin of devicePlugins) {
    pluginList[plugin.id] = {
      status: 'enabled',
      details: plugin.details,
      definition: plugin,
    };
  }
  for (const plugin of disabledPlugins) {
    pluginList[plugin.id] = {
      status: 'disabled',
      details: plugin.details,
      definition: plugin,
    };
  }
  for (const plugin of downloadablePlugins) {
    pluginList[plugin.id] = {
      status: 'uninstalled',
      details: plugin,
    };
  }
  for (const [plugin, reason] of unavailablePlugins) {
    pluginList[plugin.id] = {
      status: 'unavailable',
      details: plugin,
      reason,
    };
  }
  return pluginList;
}

export type PluginStatus =
  | 'ready'
  | 'unknown'
  | 'failed'
  | 'gatekeeped'
  | 'marketplace_installable';

export function getPluginStatus(
  store: Store,
  id: string,
): [state: PluginStatus, reason?: string] {
  const state: PluginsState = store.getState().plugins;
  if (state.devicePlugins.has(id) || state.clientPlugins.has(id)) {
    return ['ready'];
  }
  const gateKeepedDetails = state.gatekeepedPlugins.find((d) => d.id === id);
  if (gateKeepedDetails) {
    return ['gatekeeped', gateKeepedDetails.gatekeeper];
  }
  const failedPluginEntry = state.failedPlugins.find(
    ([details]) => details.id === id,
  );
  if (failedPluginEntry) {
    return ['failed', failedPluginEntry[1]];
  }
  if (state.marketplacePlugins.find((d) => d.id === id)) {
    return ['marketplace_installable'];
  }
  return ['unknown'];
}

export function getLatestCompatibleVersionOfEachPlugin<
  T extends ConcretePluginDetails,
>(plugins: T[]): T[] {
  const latestCompatibleVersions: Map<string, T> = new Map();
  for (const plugin of plugins) {
    if (isPluginCompatible(plugin)) {
      const loadedVersion = latestCompatibleVersions.get(plugin.id);
      if (!loadedVersion || isPluginVersionMoreRecent(plugin, loadedVersion)) {
        latestCompatibleVersions.set(plugin.id, plugin);
      }
    }
  }
  return Array.from(latestCompatibleVersions.values());
}
