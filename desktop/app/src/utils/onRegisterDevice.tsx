/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {FlipperPlugin, FlipperDevicePlugin} from '../plugin';
import {setPluginState} from '../reducers/pluginStates';
import BaseDevice from '../devices/BaseDevice';
import {getPersistedState} from '../utils/pluginUtils';

export function registerDeviceCallbackOnPlugins(
  store: Store,
  devicePlugins: Map<string, typeof FlipperDevicePlugin>,
  clientPlugins: Map<string, typeof FlipperPlugin>,
  device: BaseDevice,
) {
  const callRegisterDeviceHook = (
    plugin: typeof FlipperDevicePlugin | typeof FlipperPlugin,
  ) => {
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
