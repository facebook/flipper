/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperDevicePlugin, FlipperPlugin, FlipperBasePlugin} from '../plugin';
import BaseDevice from '../devices/BaseDevice';
import {State as PluginStatesState} from '../reducers/pluginStates';
import {State as PluginsState} from '../reducers/plugins';
import {State as PluginMessageQueueState} from '../reducers/pluginMessageQueue';
import {PluginDefinition} from '../dispatcher/plugins';
import {deconstructPluginKey} from './clientUtils';

type Client = import('../Client').default;

export function pluginsClassMap(
  plugins: PluginsState,
): Map<string, typeof FlipperDevicePlugin | typeof FlipperPlugin> {
  const pluginsMap: Map<
    string,
    typeof FlipperDevicePlugin | typeof FlipperPlugin
  > = new Map([]);
  plugins.clientPlugins.forEach((val, key) => {
    pluginsMap.set(key, val);
  });
  plugins.devicePlugins.forEach((val, key) => {
    pluginsMap.set(key, val);
  });
  return pluginsMap;
}

export function getPluginKey(
  selectedApp: string | null,
  baseDevice: BaseDevice | null,
  pluginID: string,
): string {
  if (selectedApp) {
    return `${selectedApp}#${pluginID}`;
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
): Array<string> {
  const pluginsMap: Map<
    string,
    typeof FlipperDevicePlugin | typeof FlipperPlugin
  > = pluginsClassMap(plugins);
  return getPersistentPlugins(plugins).filter(plugin => {
    const pluginClass = pluginsMap.get(plugin);
    const keys = [
      ...new Set([
        ...Object.keys(pluginsState),
        ...Object.keys(pluginsMessageQueue),
      ]),
    ]
      .filter(k => !selectedClient || k.includes(selectedClient.id))
      .map(key => deconstructPluginKey(key).pluginName);
    let result = plugin == 'DeviceLogs';
    const pluginsWithExportPersistedState =
      pluginClass && pluginClass.exportPersistedState != undefined;
    const pluginsWithReduxData = keys.includes(plugin);
    if (!result && selectedClient) {
      // If there is a selected client, active persistent plugin is the plugin which is active for selectedClient and also persistent.
      result =
        selectedClient.plugins.includes(plugin) &&
        (pluginsWithExportPersistedState || pluginsWithReduxData);
    } else if (!result && !selectedClient) {
      // If there is no selected client, active persistent plugin is the plugin which is just persistent.
      result =
        (pluginClass && pluginClass.exportPersistedState != undefined) ||
        keys.includes(plugin);
    }
    return result;
  });
}

export function getPersistentPlugins(plugins: PluginsState): Array<string> {
  const pluginsMap: Map<
    string,
    typeof FlipperDevicePlugin | typeof FlipperPlugin
  > = pluginsClassMap(plugins);

  const arr: Array<PluginDefinition> = plugins.disabledPlugins.concat(
    plugins.gatekeepedPlugins,
  );
  arr.forEach((plugin: PluginDefinition) => {
    if (pluginsMap.has(plugin.name)) {
      pluginsMap.delete(plugin.name);
    }
  });

  plugins.failedPlugins.forEach((plugin: [PluginDefinition, string]) => {
    if (plugin[0] && plugin[0].name && pluginsMap.has(plugin[0].name)) {
      pluginsMap.delete(plugin[0].name);
    }
  });

  const activePlugins = [...pluginsMap.keys()];

  return activePlugins.filter(plugin => {
    const pluginClass = pluginsMap.get(plugin);
    return (
      plugin == 'DeviceLogs' ||
      (pluginClass &&
        (pluginClass.defaultPersistedState != undefined ||
          pluginClass.exportPersistedState != undefined))
    );
  });
}
