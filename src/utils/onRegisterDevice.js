/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {Store} from '../reducers/index.js';
import {FlipperPlugin, FlipperDevicePlugin} from '../plugin.js';
import type BaseDevice from '../devices/BaseDevice.js';
import {setPluginState} from '../reducers/pluginStates.js';
import {getPersistedState} from '../utils/pluginUtils.js';

export function registerDeviceCallbackOnPlugins(
  store: Store,
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
  clientPlugins: Map<string, Class<FlipperPlugin<>>>,
  device: BaseDevice,
) {
  const callRegisterDeviceHook = plugin => {
    if (plugin.onRegisterDevice) {
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
