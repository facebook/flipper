/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createContext, useContext} from 'react';
import {SandyPluginInstance, PluginFactory} from './Plugin';
import {SandyDevicePluginInstance, DevicePluginFactory} from './DevicePlugin';

export const SandyPluginContext = createContext<
  SandyPluginInstance | SandyDevicePluginInstance | undefined
>(undefined);

export function usePluginInstance():
  | SandyPluginInstance
  | SandyDevicePluginInstance {
  const pluginInstance = useContext(SandyPluginContext);
  if (!pluginInstance) {
    throw new Error('Sandy Plugin context not available');
  }
  return pluginInstance;
}

export function usePlugin<
  Factory extends PluginFactory<any, any> | DevicePluginFactory,
>(plugin: Factory): ReturnType<Factory> {
  const pluginInstance = usePluginInstance();
  // In principle we don't *need* the plugin, but having it passed it makes sure the
  // return of this function is strongly typed, without the user needing to create it's own
  // context.
  // But since we pass it, let's make sure the user did request the proper context
  const pluginFromDefinition = pluginInstance.definition.isDevicePlugin
    ? pluginInstance.definition.asDevicePluginModule().devicePlugin
    : pluginInstance.definition.asPluginModule().plugin;
  if (pluginFromDefinition !== plugin) {
    throw new Error(
      `Plugin in context (${pluginFromDefinition}) didn't match the type of the requested plugin (${plugin})`,
    );
  }
  return pluginInstance.instanceApi;
}
