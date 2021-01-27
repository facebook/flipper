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
  registerLoadedPlugins,
  registerBundledPlugins,
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
import {
  ActivatablePluginDetails,
  BundledPluginDetails,
  PluginDetails,
} from 'flipper-plugin-lib';
import {tryCatchReportPluginFailures, reportUsage} from '../utils/metrics';
import * as FlipperPluginSDK from 'flipper-plugin';
import {_SandyPluginDefinition} from 'flipper-plugin';
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

  const gatekeepedPlugins: Array<ActivatablePluginDetails> = [];
  const disabledPlugins: Array<ActivatablePluginDetails> = [];
  const failedPlugins: Array<[ActivatablePluginDetails, string]> = [];

  defaultPluginsIndex = getDefaultPluginsIndex();

  const uninstalledPlugins = store.getState().pluginManager.uninstalledPlugins;

  const bundledPlugins = getBundledPlugins();

  const loadedPlugins = filterNewestVersionOfEachPlugin(
    bundledPlugins,
    await getDynamicPlugins(),
  ).filter((p) => !uninstalledPlugins.has(p.name));

  const initialPlugins: PluginDefinition[] = loadedPlugins
    .map(reportVersion)
    .filter(checkDisabled(disabledPlugins))
    .filter(checkGK(gatekeepedPlugins))
    .map(createRequirePluginFunction(failedPlugins))
    .filter(notNull);

  store.dispatch(registerBundledPlugins(bundledPlugins));
  store.dispatch(registerLoadedPlugins(loadedPlugins));
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

function reportVersion(pluginDetails: ActivatablePluginDetails) {
  reportUsage(
    'plugin:version',
    {
      version: pluginDetails.version,
    },
    pluginDetails.id,
  );
  return pluginDetails;
}

export function filterNewestVersionOfEachPlugin<
  T1 extends PluginDetails,
  T2 extends PluginDetails
>(bundledPlugins: T1[], dynamicPlugins: T2[]): (T1 | T2)[] {
  const pluginByName: {[key: string]: T1 | T2} = {};
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

function getBundledPlugins(): Array<BundledPluginDetails> {
  // DefaultPlugins that are included in the bundle.
  // List of defaultPlugins is written at build time
  const pluginPath =
    process.env.BUNDLED_PLUGIN_PATH ||
    (isProduction()
      ? path.join(__dirname, 'defaultPlugins')
      : './defaultPlugins/index.json');

  let bundledPlugins: Array<BundledPluginDetails> = [];
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

export const checkGK = (gatekeepedPlugins: Array<ActivatablePluginDetails>) => (
  plugin: ActivatablePluginDetails,
): boolean => {
  try {
    if (!plugin.gatekeeper) {
      return true;
    }
    const result = GK.get(plugin.gatekeeper);
    if (!result) {
      gatekeepedPlugins.push(plugin);
    }
    return result;
  } catch (err) {
    console.error(`Failed to check GK for plugin ${plugin.id}`, err);
    return false;
  }
};

export const checkDisabled = (
  disabledPlugins: Array<ActivatablePluginDetails>,
) => {
  let enabledList: Set<string> | null = null;
  let disabledList: Set<string> = new Set();
  try {
    if (process.env.FLIPPER_ENABLED_PLUGINS) {
      enabledList = new Set<string>(
        process.env.FLIPPER_ENABLED_PLUGINS.split(','),
      );
    }
    disabledList = config().disabledPlugins;
  } catch (e) {
    console.error('Failed to compute enabled/disabled plugins', e);
  }
  return (plugin: ActivatablePluginDetails): boolean => {
    try {
      if (disabledList.has(plugin.name)) {
        disabledPlugins.push(plugin);
        return false;
      }
      if (
        enabledList &&
        !(
          enabledList.has(plugin.name) ||
          enabledList.has(plugin.id) ||
          enabledList.has(plugin.name.replace('flipper-plugin-', ''))
        )
      ) {
        disabledPlugins.push(plugin);
        return false;
      }
      return true;
    } catch (e) {
      console.error(
        `Failed to check whether plugin ${plugin.id} is disabled`,
        e,
      );
      return false;
    }
  };
};

export const createRequirePluginFunction = (
  failedPlugins: Array<[ActivatablePluginDetails, string]>,
  reqFn: Function = global.electronRequire,
) => {
  return (pluginDetails: ActivatablePluginDetails): PluginDefinition | null => {
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
  pluginDetails: ActivatablePluginDetails,
  reqFn: Function = global.electronRequire,
): PluginDefinition => {
  reportUsage(
    'plugin:load',
    {
      version: pluginDetails.version,
    },
    pluginDetails.id,
  );
  return tryCatchReportPluginFailures(
    () => requirePluginInternal(pluginDetails, reqFn),
    'plugin:load',
    pluginDetails.id,
  );
};

const requirePluginInternal = (
  pluginDetails: ActivatablePluginDetails,
  reqFn: Function = global.electronRequire,
): PluginDefinition => {
  let plugin = pluginDetails.isBundled
    ? defaultPluginsIndex[pluginDetails.name]
    : reqFn(pluginDetails.entry);
  if (pluginDetails.flipperSDKVersion) {
    // Sandy plugin
    return new _SandyPluginDefinition(pluginDetails, plugin);
  } else {
    // classic plugin
    if (plugin.default) {
      plugin = plugin.default;
    }
    if (!(plugin.prototype instanceof FlipperBasePlugin)) {
      throw new Error(`Plugin ${plugin.name} is not a FlipperBasePlugin`);
    }

    if (plugin.id && pluginDetails.id !== plugin.id) {
      console.error(
        `Plugin name mismatch: Package '${pluginDetails.id}' exposed a plugin with id '${plugin.id}'. Please update the 'package.json' to match the exposed plugin id`,
      );
    }
    plugin.id = plugin.id || pluginDetails.id;
    plugin.packageName = pluginDetails.name;
    plugin.details = pluginDetails;

    // set values from package.json as static variables on class
    Object.keys(pluginDetails).forEach((key) => {
      if (key !== 'name' && key !== 'id') {
        plugin[key] =
          plugin[key] || pluginDetails[key as keyof ActivatablePluginDetails];
      }
    });
  }
  return plugin;
};
