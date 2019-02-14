/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type {Logger} from '../fb-interfaces/Logger.js';
import type {FlipperPlugin, FlipperDevicePlugin} from '../plugin.js';
import type {State} from '../reducers/plugins';

import React from 'react';
import ReactDOM from 'react-dom';
import * as Flipper from '../index.js';
import {
  registerPlugins,
  addGatekeepedPlugins,
  addDisabledPlugins,
  addFailedPlugins,
} from '../reducers/plugins';
import {remote} from 'electron';
import GK from '../fb-stubs/GK';
import {FlipperBasePlugin} from '../plugin.js';
import {setupMenuBar} from '../MenuBar.js';
import path from 'path';
import {default as config} from '../utils/processConfig.js';
import isProduction from '../utils/isProduction';

export type PluginDefinition = {
  name: string,
  out: string,
  gatekeeper?: string,
  entry?: string,
};

export default (store: Store, logger: Logger) => {
  // expose Flipper and exact globally for dynamically loaded plugins
  const globalObject = typeof window === 'undefined' ? global : window;
  globalObject.React = React;
  globalObject.ReactDOM = ReactDOM;
  globalObject.Flipper = Flipper;

  const gatekeepedPlugins: Array<PluginDefinition> = [];
  const disabledPlugins: Array<PluginDefinition> = [];
  const failedPlugins: Array<[PluginDefinition, string]> = [];

  const initialPlugins: Array<
    Class<FlipperPlugin<> | FlipperDevicePlugin<>>,
  > = [...getBundledPlugins(), ...getDynamicPlugins()]
    .filter(checkDisabled(disabledPlugins))
    .filter(checkGK(gatekeepedPlugins))
    .map(requirePlugin(failedPlugins))
    .filter(Boolean);

  store.dispatch(addGatekeepedPlugins(gatekeepedPlugins));
  store.dispatch(addDisabledPlugins(disabledPlugins));
  store.dispatch(addFailedPlugins(failedPlugins));
  store.dispatch(registerPlugins(initialPlugins));

  let state: ?State = null;
  store.subscribe(() => {
    const newState = store.getState().plugins;
    if (state !== newState) {
      setupMenuBar(
        [
          ...newState.devicePlugins.values(),
          ...newState.clientPlugins.values(),
        ],
        store,
      );
    }
    state = newState;
  });
};

function getBundledPlugins(): Array<PluginDefinition> {
  if (!isProduction()) {
    // Plugins are only bundled in production builds
    return [];
  }

  // DefaultPlugins that are included in the bundle.
  // List of defaultPlugins is written at build time
  const pluginPath =
    process.env.BUNDLED_PLUGIN_PATH || path.join(__dirname, 'defaultPlugins');

  let bundledPlugins: Array<PluginDefinition> = [];
  try {
    bundledPlugins = global.electronRequire(
      path.join(pluginPath, 'index.json'),
    );
  } catch (e) {
    console.error(e);
  }

  return bundledPlugins.map(plugin => ({
    ...plugin,
    out: path.join(pluginPath, plugin.out),
  }));
}

export function getDynamicPlugins() {
  let dynamicPlugins: Array<PluginDefinition> = [];
  try {
    dynamicPlugins = JSON.parse(
      // $FlowFixMe process.env not defined in electron API spec
      remote?.process.env.PLUGINS || process.env.PLUGINS || '[]',
    );
  } catch (e) {
    console.error(e);
  }
  return dynamicPlugins;
}

export const checkGK = (gatekeepedPlugins: Array<PluginDefinition>) => (
  plugin: PluginDefinition,
): boolean => {
  if (!plugin.gatekeeper) {
    return true;
  }
  const result = GK.get(plugin.gatekeeper);
  if (!result) {
    gatekeepedPlugins.push(plugin);
    console.warn(
      'Plugin %s will be ignored as user is not part of the gatekeeper "%s".',
      plugin.name,
      plugin.gatekeeper,
    );
  }
  return result;
};

export const checkDisabled = (disabledPlugins: Array<PluginDefinition>) => (
  plugin: PluginDefinition,
): boolean => {
  let disabledList: Set<string> = new Set();
  try {
    disabledList = config().disabledPlugins;
  } catch (e) {
    console.error(e);
  }

  if (disabledList.has(plugin.name)) {
    disabledPlugins.push(plugin);
  }

  return !disabledList.has(plugin.name);
};

export const requirePlugin = (
  failedPlugins: Array<[PluginDefinition, string]>,
  reqFn: Function = global.electronRequire,
) => {
  return (
    pluginDefinition: PluginDefinition,
  ): ?Class<FlipperPlugin<> | FlipperDevicePlugin<>> => {
    try {
      let plugin = reqFn(pluginDefinition.out);
      if (plugin.default) {
        plugin = plugin.default;
      }
      if (!plugin.prototype instanceof FlipperBasePlugin) {
        throw new Error(`Plugin ${plugin.name} is not a FlipperBasePlugin`);
      }

      // set values from package.json as static variables on class
      Object.keys(pluginDefinition).forEach(key => {
        if (key === 'name') {
          plugin.id = plugin.id || pluginDefinition.name;
        } else if (key === 'id') {
          throw new Error(
            'Field "id" not allowed in package.json. The plugin\'s name will be used as ID"',
          );
        } else {
          plugin[key] = plugin[key] || pluginDefinition[key];
        }
      });

      return plugin;
    } catch (e) {
      failedPlugins.push([pluginDefinition, e.message]);
      console.error(pluginDefinition, e);
      return null;
    }
  };
};
