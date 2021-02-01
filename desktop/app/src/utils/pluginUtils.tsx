/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlipperDevicePlugin,
  FlipperBasePlugin,
  PluginDefinition,
  DevicePluginDefinition,
  isSandyPlugin,
  ClientPluginDefinition,
} from '../plugin';
import type {State} from '../reducers';
import type {State as PluginStatesState} from '../reducers/pluginStates';
import type {State as PluginsState} from '../reducers/plugins';
import {_SandyPluginDefinition} from 'flipper-plugin';
import type BaseDevice from '../devices/BaseDevice';
import type Client from '../Client';
import type {
  BundledPluginDetails,
  DownloadablePluginDetails,
  PluginDetails,
} from 'flipper-plugin-lib';
import {filterNewestVersionOfEachPlugin} from '../dispatcher/plugins';

export const defaultEnabledBackgroundPlugins = ['Navigation']; // The navigation plugin is enabled always, to make sure the navigation features works

export function pluginsClassMap(
  plugins: PluginsState,
): Map<string, PluginDefinition> {
  return new Map<string, PluginDefinition>([
    ...plugins.clientPlugins.entries(),
    ...plugins.devicePlugins.entries(),
  ]);
}

export function getPluginKey(
  selectedAppId: string | null | undefined,
  baseDevice: {serial: string} | null | undefined,
  pluginID: string,
): string {
  if (selectedAppId) {
    return `${selectedAppId}#${pluginID}`;
  }
  if (baseDevice) {
    // If selected App is not defined, then the plugin is a device plugin
    return `${baseDevice.serial}#${pluginID}`;
  }
  return `unknown#${pluginID}`;
}

export function getPersistedState<PersistedState>(
  pluginKey: string,
  persistingPlugin: typeof FlipperBasePlugin | null,
  pluginStates: PluginStatesState,
): PersistedState | null {
  if (!persistingPlugin) {
    return null;
  }

  const persistedState: PersistedState = {
    ...persistingPlugin.defaultPersistedState,
    ...pluginStates[pluginKey],
  };
  return persistedState;
}

export function getExportablePlugins(
  state: Pick<
    State,
    'plugins' | 'connections' | 'pluginStates' | 'pluginMessageQueue'
  >,
  device: BaseDevice | undefined | null,
  client?: Client,
): {id: string; label: string}[] {
  const availablePlugins = computePluginLists(
    device ?? undefined,
    undefined,
    client,
    state.plugins,
    state.connections.userStarredPlugins,
  );

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
  {
    pluginStates,
    pluginMessageQueue,
  }: Pick<State, 'pluginStates' | 'pluginMessageQueue'>,
  device: BaseDevice | undefined | null,
  client: Client | undefined,
  plugin: PluginDefinition,
): boolean {
  // can generate an export when requested
  if (plugin.exportPersistedState) {
    return true;
  }
  const pluginKey = isDevicePluginDefinition(plugin)
    ? getPluginKey(undefined, device, plugin.id)
    : getPluginKey(client?.id, undefined, plugin.id);
  // plugin has exportable redux state
  if (pluginStates[pluginKey]) {
    return true;
  }
  // plugin has exportable sandy state
  if (client?.sandyPluginStates.get(plugin.id)?.isPersistable()) {
    return true;
  }
  if (device?.sandyPluginStates.get(plugin.id)?.isPersistable()) {
    return true;
  }
  // plugin has pending messages and a persisted state reducer or isSandy
  if (
    pluginMessageQueue[pluginKey] &&
    ((plugin as any).defaultPersistedState || isSandyPlugin(plugin))
  ) {
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
  return getPluginTitle(a) > getPluginTitle(b) ? 1 : -1;
}

export function isDevicePluginDefinition(
  definition: PluginDefinition,
): definition is DevicePluginDefinition {
  return (
    (definition as any).prototype instanceof FlipperDevicePlugin ||
    (definition instanceof _SandyPluginDefinition && definition.isDevicePlugin)
  );
}

export function getPluginTooltip(details: PluginDetails): string {
  return `${getPluginTitle(details)} (${details.id}@${details.version}) ${
    details.description ?? ''
  }`;
}

export function computePluginLists(
  device: BaseDevice | undefined,
  metroDevice: BaseDevice | undefined,
  client: Client | undefined,
  plugins: State['plugins'],
  userStarredPlugins: State['connections']['userStarredPlugins'],
  _pluginsChanged?: number, // this argument is purely used to invalidate the memoization cache
) {
  const devicePlugins: DevicePluginDefinition[] =
    device?.devicePlugins.map((name) => plugins.devicePlugins.get(name)!) ?? [];
  const metroPlugins: DevicePluginDefinition[] =
    metroDevice?.devicePlugins.map(
      (name) => plugins.devicePlugins.get(name)!,
    ) ?? [];
  const enabledPlugins: ClientPluginDefinition[] = [];
  const disabledPlugins: ClientPluginDefinition[] = [];
  const unavailablePlugins: [plugin: PluginDetails, reason: string][] = [];
  const downloadablePlugins: (
    | DownloadablePluginDetails
    | BundledPluginDetails
  )[] = [];

  if (device) {
    // find all device plugins that aren't part of the current device / metro
    const detectedDevicePlugins = new Set([
      ...device.devicePlugins,
      ...(metroDevice?.devicePlugins ?? []),
    ]);
    for (const [name, definition] of plugins.devicePlugins.entries()) {
      if (!detectedDevicePlugins.has(name)) {
        unavailablePlugins.push([
          definition.details,
          `Device plugin '${getPluginTitle(
            definition.details,
          )}' is not supported by the current device type.`,
        ]);
      }
    }
  }

  // process problematic plugins
  plugins.disabledPlugins.forEach((plugin) => {
    unavailablePlugins.push([plugin, 'Plugin is disabled by configuration']);
  });
  plugins.gatekeepedPlugins.forEach((plugin) => {
    unavailablePlugins.push([
      plugin,
      `This plugin is only available to members of gatekeeper '${plugin.gatekeeper}'`,
    ]);
  });
  plugins.failedPlugins.forEach(([plugin, error]) => {
    unavailablePlugins.push([
      plugin,
      `Flipper failed to load this plugin: '${error}'`,
    ]);
  });

  // process all client plugins
  if (device && client) {
    const clientPlugins = Array.from(plugins.clientPlugins.values()).sort(
      sortPluginsByName,
    );
    const favoritePlugins = getFavoritePlugins(
      device,
      client,
      clientPlugins,
      client && userStarredPlugins[client.query.app],
      true,
    );
    clientPlugins.forEach((plugin) => {
      if (!client.supportsPlugin(plugin.id)) {
        unavailablePlugins.push([
          plugin.details,
          `Plugin '${getPluginTitle(
            plugin.details,
          )}' is installed in Flipper, but not supported by the client application`,
        ]);
      } else if (favoritePlugins.includes(plugin)) {
        enabledPlugins.push(plugin);
      } else {
        disabledPlugins.push(plugin);
      }
    });
    const uninstalledMarketplacePlugins = filterNewestVersionOfEachPlugin(
      [...plugins.bundledPlugins.values()],
      plugins.marketplacePlugins,
    ).filter((p) => !plugins.loadedPlugins.has(p.id));
    uninstalledMarketplacePlugins.forEach((plugin) => {
      if (client.supportsPlugin(plugin.id)) {
        downloadablePlugins.push(plugin);
      } else {
        unavailablePlugins.push([
          plugin,
          `Plugin '${getPluginTitle(
            plugin,
          )}' is not installed in Flipper and not supported by the client application`,
        ]);
      }
    });
  }

  devicePlugins.sort(sortPluginsByName);
  metroPlugins.sort(sortPluginsByName);
  unavailablePlugins.sort(([a], [b]) => {
    return getPluginTitle(a) > getPluginTitle(b) ? 1 : -1;
  });
  downloadablePlugins.sort((a, b) => {
    return getPluginTitle(a) > getPluginTitle(b) ? 1 : -1;
  });

  return {
    devicePlugins,
    metroPlugins,
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
  starredPlugins: undefined | string[],
  returnFavoredPlugins: boolean, // if false, unfavoried plugins are returned
): PluginDefinition[] {
  if (device.isArchived) {
    if (!returnFavoredPlugins) {
      return [];
    }
    // for archived plugins, all stored plugins are enabled
    return allPlugins.filter(
      (plugin) => client.plugins.indexOf(plugin.id) !== -1,
    );
  }
  if (!starredPlugins || !starredPlugins.length) {
    return returnFavoredPlugins ? [] : allPlugins;
  }
  return allPlugins.filter((plugin) => {
    const idx = starredPlugins.indexOf(plugin.id);
    return idx === -1 ? !returnFavoredPlugins : returnFavoredPlugins;
  });
}
