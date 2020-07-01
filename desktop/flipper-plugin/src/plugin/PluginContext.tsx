/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createContext, useContext} from 'react';
import {SandyPluginInstance, FlipperPluginFactory} from './Plugin';

export const SandyPluginContext = createContext<
  SandyPluginInstance | undefined
>(undefined);

export function usePlugin<PluginFactory extends FlipperPluginFactory<any, any>>(
  plugin: PluginFactory,
): ReturnType<PluginFactory> {
  const pluginInstance = useContext(SandyPluginContext);
  if (!pluginInstance) {
    throw new Error('Plugin context not available');
  }
  // In principle we don't *need* the plugin, but having it passed it makes sure the
  // return of this function is strongly typed, without the user needing to create it's own
  // context.
  // But since we pass it, let's make sure the user did request the proper context
  if (pluginInstance.definition.module.plugin !== plugin) {
    throw new Error(
      `Plugin context (${pluginInstance.definition.module.plugin}) didn't match the type of the requested plugin (${plugin})`,
    );
  }
  return pluginInstance.instanceApi;
}
