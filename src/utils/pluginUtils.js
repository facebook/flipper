/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type BaseDevice from '../devices/BaseDevice.js';
import {FlipperDevicePlugin, FlipperPlugin} from '../plugin.js';
import type {State as PluginStatesState} from '../reducers/pluginStates.js';

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
