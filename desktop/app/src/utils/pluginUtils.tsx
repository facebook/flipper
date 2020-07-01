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
} from '../plugin';
import {State as PluginStatesState} from '../reducers/pluginStates';
import {State as PluginsState} from '../reducers/plugins';
import {State as PluginMessageQueueState} from '../reducers/pluginMessageQueue';
import {PluginDetails} from 'flipper-plugin-lib';
import {deconstructPluginKey, deconstructClientId} from './clientUtils';

type Client = import('../Client').default;

export const defaultEnabledBackgroundPlugins = ['Navigation']; // The navigation plugin is enabled always, to make sure the navigation features works

export function pluginsClassMap(
  plugins: PluginsState,
): Map<string, PluginDefinition> {
  const pluginsMap: Map<string, PluginDefinition> = new Map([]);
  plugins.clientPlugins.forEach((val, key) => {
    pluginsMap.set(key, val);
  });
  plugins.devicePlugins.forEach((val, key) => {
    pluginsMap.set(key, val);
  });
  return pluginsMap;
}

export function getPluginKey(
  selectedAppId: string | null,
  baseDevice: {serial: string} | null,
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

/**
 *
 * @param starredPlugin  starredPlugin is the dictionary of client and its enabled plugin
 * @param client Optional paramater indicating the selected client.
 * @param plugins  Plugins from the state which has the mapping to Plugin's Class.

 * Returns plugins which are enabled or which has exportPersistedState function defined for the passed client.
 * Note all device plugins are enabled.
 */

export function getEnabledOrExportPersistedStatePlugins(
  starredPlugin: {
    [client: string]: string[];
  },
  client: Client,
  plugins: PluginsState,
): Array<{id: string; label: string}> {
  const appName = deconstructClientId(client.id).app;
  const pluginsMap: Map<string, PluginDefinition> = pluginsClassMap(plugins);
  // Enabled Plugins with no exportPersistedState function defined
  const enabledPlugins = starredPlugin[appName]
    ? starredPlugin[appName]
        .map((pluginName) => pluginsMap.get(pluginName)!)
        .filter((plugin) => {
          return !plugin.exportPersistedState;
        })
        .sort(sortPluginsByName)
        .map((plugin) => {
          return {id: plugin.id, label: getPluginTitle(plugin)};
        })
    : [];
  // Device Plugins
  const devicePlugins = Array.from(plugins.devicePlugins.keys())
    .filter((plugin) => {
      return client.plugins.includes(plugin);
    })
    .map((plugin) => {
      return {
        id: plugin,
        label: getPluginTitle(plugins.devicePlugins.get(plugin)!),
      };
    });
  // Plugins which have defined exportPersistedState.
  const exportPersistedStatePlugins = client.plugins
    .filter((name) => {
      return pluginsMap.get(name)?.exportPersistedState != null;
    })
    .map((name) => {
      const plugin = pluginsMap.get(name)!;
      return {id: plugin.id, label: getPluginTitle(plugin)};
    });
  return [
    ...devicePlugins,
    ...enabledPlugins,
    ...exportPersistedStatePlugins,
    {id: 'DeviceLogs', label: 'Logs'},
  ];
}

/**
 *
 * @param pluginsState  PluginsState of the Redux Store.
 * @param plugins  Plugins from the state which has the mapping to Plugin's Class.
 * @param selectedClient Optional paramater indicating the selected client.
 * Returns active persistent plugin, which means plugins which has the data in redux store or has the `exportPersistedState` function defined which can return the plugin's data when called.
 * If the selectedClient is defined then the active persistent plugins only for the selectedClient will be returned, otherwise it will return all active persistent plugins.
 */
export function getActivePersistentPlugins(
  pluginsState: PluginStatesState,
  pluginsMessageQueue: PluginMessageQueueState,
  plugins: PluginsState,
  selectedClient?: Client,
): {id: string; label: string}[] {
  const pluginsMap: Map<string, PluginDefinition> = pluginsClassMap(plugins);
  return getPersistentPlugins(plugins)
    .map((pluginName) => pluginsMap.get(pluginName)!)
    .sort(sortPluginsByName)
    .map((plugin) => {
      const keys = [
        ...new Set([
          ...Object.keys(pluginsState),
          ...Object.keys(pluginsMessageQueue),
        ]),
      ]
        .filter((k) => !selectedClient || k.includes(selectedClient.id))
        .map((key) => deconstructPluginKey(key).pluginName);
      let result = plugin.id == 'DeviceLogs';
      const pluginsWithExportPersistedState =
        plugin && plugin.exportPersistedState != undefined;
      const pluginsWithReduxData = keys.includes(plugin.id);
      if (!result && selectedClient) {
        // If there is a selected client, active persistent plugin is the plugin which is active for selectedClient and also persistent.
        result =
          selectedClient.plugins.includes(plugin.id) &&
          (pluginsWithExportPersistedState || pluginsWithReduxData);
      } else if (!result && !selectedClient) {
        // If there is no selected client, active persistent plugin is the plugin which is just persistent.
        result =
          (plugin && plugin.exportPersistedState != undefined) ||
          keys.includes(plugin.id);
      }
      return (result
        ? {
            id: plugin.id,
            label: getPluginTitle(plugin),
          }
        : undefined)!;
    })
    .filter(Boolean);
}

export function getPersistentPlugins(plugins: PluginsState): Array<string> {
  const pluginsMap: Map<string, PluginDefinition> = pluginsClassMap(plugins);

  const arr: Array<PluginDetails> = plugins.disabledPlugins.concat(
    plugins.gatekeepedPlugins,
  );
  arr.forEach((plugin: PluginDetails) => {
    if (pluginsMap.has(plugin.name)) {
      pluginsMap.delete(plugin.name);
    }
  });

  plugins.failedPlugins.forEach((plugin: [PluginDetails, string]) => {
    if (plugin[0] && plugin[0].name && pluginsMap.has(plugin[0].name)) {
      pluginsMap.delete(plugin[0].name);
    }
  });

  const activePlugins = [...pluginsMap.keys()];

  return activePlugins.filter((plugin) => {
    const pluginClass = pluginsMap.get(plugin);
    return (
      plugin == 'DeviceLogs' ||
      (pluginClass &&
        // TODO: support Sandy plugin T68683449
        !isSandyPlugin(pluginClass) &&
        (pluginClass.defaultPersistedState != undefined ||
          pluginClass.exportPersistedState != undefined))
    );
  });
}

export function getPluginTitle(pluginClass: PluginDefinition) {
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
  // TODO: support Sandy device plugins T68738317
  // @ts-ignore
  return definition.prototype instanceof FlipperDevicePlugin;
}
