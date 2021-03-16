/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Store} from '../reducers/index';
import type {
  ClientPluginMap,
  DevicePluginMap,
  PluginDefinition,
} from '../plugin';
import {setPluginState} from '../reducers/pluginStates';
import type BaseDevice from '../devices/BaseDevice';
import {getPersistedState, isSandyPlugin} from '../utils/pluginUtils';

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
