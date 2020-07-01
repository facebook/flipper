/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {
  ClientPluginMap,
  DevicePluginMap,
  PluginDefinition,
  isSandyPlugin,
} from '../plugin';
import {setPluginState} from '../reducers/pluginStates';
import BaseDevice from '../devices/BaseDevice';
import {getPersistedState} from '../utils/pluginUtils';

export function registerDeviceCallbackOnPlugins(
  store: Store,
  devicePlugins: DevicePluginMap,
  clientPlugins: ClientPluginMap,
  device: BaseDevice,
) {
  const callRegisterDeviceHook = (plugin: PluginDefinition) => {
    // This hook is not registered for Sandy plugins, let's see in the future if it is needed
    if (!isSandyPlugin(plugin) && plugin.onRegisterDevice) {
      plugin.onRegisterDevice(
        store,
        device,
        (pluginKey: string, newPluginState: any) => {
          const persistedState = getPersistedState(
            pluginKey,
            plugin,
            store.getState().pluginStates,
          );
          if (newPluginState && newPluginState !== persistedState) {
            store.dispatch(
              setPluginState({
                pluginKey,
                state: newPluginState,
              }),
            );
          }
        },
      );
    }
  };
  devicePlugins.forEach(callRegisterDeviceHook);
  clientPlugins.forEach(callRegisterDeviceHook);
}
