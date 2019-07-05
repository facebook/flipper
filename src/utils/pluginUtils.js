/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type BaseDevice from '../devices/BaseDevice.js';
import {FlipperDevicePlugin, FlipperPlugin} from '../plugin.js';
import type {State as PluginStatesState} from '../reducers/pluginStates.js';
import {pluginsClassMap} from './exportData.js';
import type {State as PluginsState} from '../reducers/plugins.js';
import type {PluginDefinition} from '../dispatcher/plugins';

export function getPluginKey(
  selectedApp: ?string,
  baseDevice: ?BaseDevice,
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
  persistingPlugin: ?Class<
    | FlipperPlugin<*, *, PersistedState>
    | FlipperDevicePlugin<*, *, PersistedState>,
  >,
  pluginStates: PluginStatesState,
): ?PersistedState {
  if (!persistingPlugin) {
    return null;
  }

  const persistedState: PersistedState = {
    ...persistingPlugin.defaultPersistedState,
    ...pluginStates[pluginKey],
  };
  return persistedState;
}

export function getActivePluginNames(plugins: PluginsState): Array<string> {
  let pluginsMap: Map<
    string,
    Class<FlipperDevicePlugin<> | FlipperPlugin<>>,
  > = pluginsClassMap(plugins);

  let arr: Array<PluginDefinition> = plugins.disabledPlugins.concat(
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
  return [...pluginsMap.keys()];
}
