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
import {pluginsClassMap} from './exportData';
import {State as PluginsState} from '../reducers/plugins';
import {PluginDefinition} from '../dispatcher/plugins';
import {deconstructPluginKey} from './clientUtils';

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

export function getActivePersistentPlugins(
  pluginsState: PluginStatesState,
  plugins: PluginsState,
): Array<string> {
  const pluginsMap: Map<
    string,
    typeof FlipperDevicePlugin | typeof FlipperPlugin
  > = pluginsClassMap(plugins);
  return getPersistentPlugins(plugins).filter(pluginName => {
    const pluginClass = pluginsMap.get(pluginName);
    const pluginNames = Object.keys(pluginsState).map(
      pluginKey => deconstructPluginKey(pluginKey).pluginName,
    );
    return (
      (pluginClass && pluginClass.exportPersistedState != undefined) ||
      pluginName == 'DeviceLogs' ||
      pluginNames.includes(pluginName)
    );
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
