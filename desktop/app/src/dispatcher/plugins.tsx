/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {PluginDefinition} from '../plugin';
import React from 'react';
import ReactDOM from 'react-dom';
import adbkit from 'adbkit';
import * as Flipper from '../index';
import {
  registerPlugins,
  addGatekeepedPlugins,
  addDisabledPlugins,
  addFailedPlugins,
} from '../reducers/plugins';
import GK from '../fb-stubs/GK';
import {FlipperBasePlugin} from '../plugin';
import {setupMenuBar} from '../MenuBar';
import path from 'path';
import {default as config} from '../utils/processConfig';
import isProduction from '../utils/isProduction';
import {notNull} from '../utils/typeUtils';
import {sideEffect} from '../utils/sideEffect';
import semver from 'semver';
import {PluginDetails} from 'flipper-plugin-lib';
import {tryCatchReportPluginFailures, reportUsage} from '../utils/metrics';
import * as FlipperPluginSDK from 'flipper-plugin';
import {SandyPluginDefinition} from 'flipper-plugin';
import loadDynamicPlugins from '../utils/loadDynamicPlugins';
import Immer from 'immer';

// eslint-disable-next-line import/no-unresolved
import getDefaultPluginsIndex from '../utils/getDefaultPluginsIndex';

let defaultPluginsIndex: any = null;

export default async (store: Store, logger: Logger) => {
  // expose Flipper and exact globally for dynamically loaded plugins
  const globalObject: any = typeof window === 'undefined' ? global : window;
  globalObject.React = React;
  globalObject.ReactDOM = ReactDOM;
  globalObject.Flipper = Flipper;
  globalObject.adbkit = adbkit;
  globalObject.FlipperPlugin = FlipperPluginSDK;
  globalObject.Immer = Immer;

  const gatekeepedPlugins: Array<PluginDetails> = [];
  const disabledPlugins: Array<PluginDetails> = [];
  const failedPlugins: Array<[PluginDetails, string]> = [];

  defaultPluginsIndex = getDefaultPluginsIndex();

  const initialPlugins: PluginDefinition[] = filterNewestVersionOfEachPlugin(
    getBundledPlugins(),
    await getDynamicPlugins(),
  )
    .map(reportVersion)
    .filter(checkDisabled(disabledPlugins))
    .filter(checkGK(gatekeepedPlugins))
    .map(createRequirePluginFunction(failedPlugins))
    .filter(notNull);

  store.dispatch(addGatekeepedPlugins(gatekeepedPlugins));
  store.dispatch(addDisabledPlugins(disabledPlugins));
  store.dispatch(addFailedPlugins(failedPlugins));
  store.dispatch(registerPlugins(initialPlugins));

  sideEffect(
    store,
    {name: 'setupMenuBar', throttleMs: 1000, fireImmediately: true},
    (state) => state.plugins,
    (plugins, store) => {
      setupMenuBar(
        [...plugins.devicePlugins.values(), ...plugins.clientPlugins.values()],
        store,
        logger,
      );
    },
  );
};

function reportVersion(pluginDetails: PluginDetails) {
  reportUsage(
    'plugin:version',
    {
      version: pluginDetails.version,
    },
    pluginDetails.id,
  );
  return pluginDetails;
}

export function filterNewestVersionOfEachPlugin(
  bundledPlugins: PluginDetails[],
  dynamicPlugins: PluginDetails[],
): PluginDetails[] {
  const pluginByName: {[key: string]: PluginDetails} = {};
  for (const plugin of bundledPlugins) {
    pluginByName[plugin.name] = plugin;
  }
  for (const plugin of dynamicPlugins) {
    if (
      !pluginByName[plugin.name] ||
      (!process.env.FLIPPER_DISABLE_PLUGIN_AUTO_UPDATE &&
        semver.gt(plugin.version, pluginByName[plugin.name].version, true))
    ) {
      pluginByName[plugin.name] = plugin;
    }
  }
  return Object.values(pluginByName);
}

function getBundledPlugins(): Array<PluginDetails> {
  // DefaultPlugins that are included in the bundle.
  // List of defaultPlugins is written at build time
  const pluginPath =
    process.env.BUNDLED_PLUGIN_PATH ||
    (isProduction()
      ? path.join(__dirname, 'defaultPlugins')
      : './defaultPlugins/index.json');

  let bundledPlugins: Array<PluginDetails> = [];
  try {
    bundledPlugins = global.electronRequire(pluginPath);
  } catch (e) {
    console.error(e);
  }

  return bundledPlugins;
}

export async function getDynamicPlugins() {
  try {
    return await loadDynamicPlugins();
  } catch (e) {
    console.error('Failed to load dynamic plugins', e);
    return [];
  }
}

export const checkGK = (gatekeepedPlugins: Array<PluginDetails>) => (
  plugin: PluginDetails,
): boolean => {
  if (!plugin.gatekeeper) {
    return true;
  }
  const result = GK.get(plugin.gatekeeper);
  if (!result) {
    gatekeepedPlugins.push(plugin);
  }
  return result;
};

export const checkDisabled = (disabledPlugins: Array<PluginDetails>) => (
  plugin: PluginDetails,
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

export const createRequirePluginFunction = (
  failedPlugins: Array<[PluginDetails, string]>,
  reqFn: Function = global.electronRequire,
) => {
  return (pluginDetails: PluginDetails): PluginDefinition | null => {
    try {
      return requirePlugin(pluginDetails, reqFn);
    } catch (e) {
      failedPlugins.push([pluginDetails, e.message]);
      console.error(`Plugin ${pluginDetails.id} failed to load`, e);
      return null;
    }
  };
};

export const requirePlugin = (
  pluginDetails: PluginDetails,
  reqFn: Function = global.electronRequire,
): PluginDefinition => {
  return tryCatchReportPluginFailures(
    () => requirePluginInternal(pluginDetails, reqFn),
    'plugin:load',
    pluginDetails.id,
  );
};

const requirePluginInternal = (
  pluginDetails: PluginDetails,
  reqFn: Function = global.electronRequire,
): PluginDefinition => {
  let plugin = pluginDetails.isDefault
    ? defaultPluginsIndex[pluginDetails.name]
    : reqFn(pluginDetails.entry);
  if (pluginDetails.flipperSDKVersion) {
    // Sandy plugin
    return new SandyPluginDefinition(pluginDetails, plugin);
  } else {
    // classic plugin
    if (plugin.default) {
      plugin = plugin.default;
    }
    if (!(plugin.prototype instanceof FlipperBasePlugin)) {
      throw new Error(`Plugin ${plugin.name} is not a FlipperBasePlugin`);
    }

    plugin.id = plugin.id || pluginDetails.id;
    plugin.packageName = pluginDetails.name;
    plugin.details = pluginDetails;

    // set values from package.json as static variables on class
    Object.keys(pluginDetails).forEach((key) => {
      if (key !== 'name' && key !== 'id') {
        plugin[key] = plugin[key] || pluginDetails[key as keyof PluginDetails];
      }
    });
  }
  return plugin;
};
