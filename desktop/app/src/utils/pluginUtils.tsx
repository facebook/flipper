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
import {deconstructPluginKey, deconstructClientId} from './clientUtils';
import {SandyPluginDefinition} from 'flipper-plugin';

type Client = import('../Client').default;

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
  const pluginsMap = pluginsClassMap(plugins);
  return getPersistentPlugins(plugins)
    .map((pluginName) => pluginsMap.get(pluginName)!)
    .sort(sortPluginsByName)
    .filter((plugin) => {
      if (plugin.id == 'DeviceLogs') {
        return true;
      }
      if (selectedClient) {
        const pluginKey = getPluginKey(
          selectedClient.id,
          {serial: selectedClient.query.device_id},
          plugin.id,
        );
        // If there is a selected client, active persistent plugins are those that (can) have persisted state
        return (
          selectedClient.isEnabledPlugin(plugin.id) &&
          // this plugin can fetch and export state
          (plugin.exportPersistedState ||
            // this plugin has some persisted state already
            pluginsState[pluginKey] ||
            pluginsMessageQueue[pluginKey] ||
            // this plugin has some persistable sandy state
            selectedClient.sandyPluginStates.get(plugin.id)?.isPersistable())
        );
      }
      {
        // If there is no selected client, active persistent plugin is the plugin which is just persistent.
        const pluginsWithReduxData = [
          ...new Set([
            ...Object.keys(pluginsState),
            ...Object.keys(pluginsMessageQueue),
          ]),
        ].map((key) => deconstructPluginKey(key).pluginName);
        return (
          (plugin && plugin.exportPersistedState != undefined) ||
          isSandyPlugin(plugin) ||
          pluginsWithReduxData.includes(plugin.id)
        );
      }
    })
    .map((plugin) => ({
      id: plugin.id,
      label: getPluginTitle(plugin),
    }));
}

/**
 * Returns all enabled plugins that are potentially exportable
 * @param plugins
 */
export function getPersistentPlugins(plugins: PluginsState): Array<string> {
  const pluginsMap = pluginsClassMap(plugins);

  [...plugins.disabledPlugins, ...plugins.gatekeepedPlugins].forEach(
    (plugin) => {
      pluginsMap.delete(plugin.name);
    },
  );
  plugins.failedPlugins.forEach(([details]) => {
    pluginsMap.delete(details.id);
  });

  return Array.from(pluginsMap.keys()).filter((plugin) => {
    const pluginClass = pluginsMap.get(plugin);
    return (
      plugin == 'DeviceLogs' ||
      isSandyPlugin(pluginClass) ||
      pluginClass?.defaultPersistedState ||
      pluginClass?.exportPersistedState
    );
  });
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
    (definition instanceof SandyPluginDefinition && definition.isDevicePlugin)
  );
}
