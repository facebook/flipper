/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Store} from '../reducers/index';
import type {Logger} from '../fb-interfaces/Logger';
import {PluginDefinition} from '../plugin';
import React from 'react';
import ReactDOM from 'react-dom';
import adbkit from 'adbkit';
import {
  registerPlugins,
  addGatekeepedPlugins,
  addDisabledPlugins,
  addFailedPlugins,
  registerLoadedPlugins,
  registerBundledPlugins,
  registerMarketplacePlugins,
  MarketplacePluginDetails,
  pluginsInitialised,
} from '../reducers/plugins';
import GK from '../fb-stubs/GK';
import {FlipperBasePlugin} from '../plugin';
import {setupMenuBar} from '../MenuBar';
import fs from 'fs-extra';
import path from 'path';
import {default as config} from '../utils/processConfig';
import {notNull} from '../utils/typeUtils';
import {sideEffect} from '../utils/sideEffect';
import {
  ActivatablePluginDetails,
  BundledPluginDetails,
  ConcretePluginDetails,
} from 'flipper-plugin-lib';
import {tryCatchReportPluginFailures, reportUsage} from '../utils/metrics';
import * as FlipperPluginSDK from 'flipper-plugin';
import {_SandyPluginDefinition} from 'flipper-plugin';
import loadDynamicPlugins from '../utils/loadDynamicPlugins';
import * as Immer from 'immer';
import * as antd from 'antd';
import * as emotion_styled from '@emotion/styled';
import * as antdesign_icons from '@ant-design/icons';
// @ts-ignore
import * as crc32 from 'crc32';

// eslint-disable-next-line import/no-unresolved
import getDefaultPluginsIndex from '../utils/getDefaultPluginsIndex';
import {isDevicePluginDefinition} from '../utils/pluginUtils';
import isPluginCompatible from '../utils/isPluginCompatible';
import isPluginVersionMoreRecent from '../utils/isPluginVersionMoreRecent';
import {getStaticPath} from '../utils/pathUtils';
import {createSandyPluginWrapper} from '../utils/createSandyPluginWrapper';
let defaultPluginsIndex: any = null;

export default async (store: Store, logger: Logger) => {
  // expose Flipper and exact globally for dynamically loaded plugins
  const globalObject: any = typeof window === 'undefined' ? global : window;

  // this list should match `replace-flipper-requires.tsx` and the `builtInModules` in `desktop/.eslintrc`
  globalObject.React = React;
  globalObject.ReactDOM = ReactDOM;
  globalObject.Flipper = require('../index');
  globalObject.adbkit = adbkit;
  globalObject.FlipperPlugin = FlipperPluginSDK;
  globalObject.Immer = Immer;
  globalObject.antd = antd;
  globalObject.emotion_styled = emotion_styled;
  globalObject.antdesign_icons = antdesign_icons;
  globalObject.crc32_hack_fix_me = crc32;

  const gatekeepedPlugins: Array<ActivatablePluginDetails> = [];
  const disabledPlugins: Array<ActivatablePluginDetails> = [];
  const failedPlugins: Array<[ActivatablePluginDetails, string]> = [];

  defaultPluginsIndex = getDefaultPluginsIndex();

  const marketplacePlugins = selectCompatibleMarketplaceVersions(
    store.getState().plugins.marketplacePlugins,
  );
  store.dispatch(registerMarketplacePlugins(marketplacePlugins));

  const uninstalledPluginNames =
    store.getState().plugins.uninstalledPluginNames;

  const bundledPlugins = await getBundledPlugins();

  const allLocalVersions = [
    ...bundledPlugins,
    ...(await getDynamicPlugins()),
  ].filter((p) => !uninstalledPluginNames.has(p.name));

  const loadedPlugins =
    getLatestCompatibleVersionOfEachPlugin(allLocalVersions);

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
  store.dispatch(pluginsInitialised());

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

export function getLatestCompatibleVersionOfEachPlugin<
  T extends ConcretePluginDetails,
>(plugins: T[]): T[] {
  const latestCompatibleVersions: Map<string, T> = new Map();
  for (const plugin of plugins) {
    if (isPluginCompatible(plugin)) {
      const loadedVersion = latestCompatibleVersions.get(plugin.id);
      if (!loadedVersion || isPluginVersionMoreRecent(plugin, loadedVersion)) {
        latestCompatibleVersions.set(plugin.id, plugin);
      }
    }
  }
  return Array.from(latestCompatibleVersions.values());
}

async function getBundledPlugins(): Promise<Array<BundledPluginDetails>> {
  // defaultPlugins that are included in the Flipper distributive.
  // List of default bundled plugins is written at build time to defaultPlugins/bundled.json.
  const pluginPath = getStaticPath(
    path.join('defaultPlugins', 'bundled.json'),
    {asarUnpacked: true},
  );
  let bundledPlugins: Array<BundledPluginDetails> = [];
  try {
    bundledPlugins = await fs.readJson(pluginPath);
  } catch (e) {
    console.error('Failed to load list of bundled plugins', e);
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

export const checkGK =
  (gatekeepedPlugins: Array<ActivatablePluginDetails>) =>
  (plugin: ActivatablePluginDetails): boolean => {
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
      const pluginDefinition = requirePlugin(pluginDetails, reqFn);
      if (
        pluginDefinition &&
        isDevicePluginDefinition(pluginDefinition) &&
        pluginDefinition.details.pluginType !== 'device'
      ) {
        console.warn(
          `Package ${pluginDefinition.details.name} contains the device plugin "${pluginDefinition.title}" defined in a wrong format. Specify "pluginType" and "supportedDevices" properties and remove exported function "supportsDevice". See details at https://fbflipper.com/docs/extending/desktop-plugin-structure#creating-a-device-plugin.`,
        );
      }
      return pluginDefinition;
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
    if (plugin.prototype === undefined) {
      throw new Error(
        `Plugin ${pluginDetails.name} is neither a class-based plugin nor a Sandy-based one.
        Ensure that it exports either a FlipperPlugin class or has flipper-plugin declared as a peer-dependency and exports a plugin and Component.
        See https://fbflipper.com/docs/extending/sandy-migration/ for more information.`,
      );
    } else if (!(plugin.prototype instanceof FlipperBasePlugin)) {
      throw new Error(
        `Plugin ${pluginDetails.name} is not a FlipperBasePlugin`,
      );
    }

    if (plugin.id && pluginDetails.id !== plugin.id) {
      console.error(
        `Plugin name mismatch: Package '${pluginDetails.id}' exposed a plugin with id '${plugin.id}'. Please update the 'package.json' to match the exposed plugin id`,
      );
    }
    plugin.id = plugin.id || pluginDetails.id;
    plugin.packageName = pluginDetails.name;
    plugin.details = pluginDetails;

    return createSandyPluginFromClassicPlugin(pluginDetails, plugin);
  }
};

export function createSandyPluginFromClassicPlugin(
  pluginDetails: ActivatablePluginDetails,
  plugin: any,
) {
  pluginDetails.id = plugin.id; // for backward compatibility, see above check!
  return new _SandyPluginDefinition(
    pluginDetails,
    createSandyPluginWrapper(plugin),
  );
}

export function selectCompatibleMarketplaceVersions(
  availablePlugins: MarketplacePluginDetails[],
): MarketplacePluginDetails[] {
  const plugins: MarketplacePluginDetails[] = [];
  for (const plugin of availablePlugins) {
    if (!isPluginCompatible(plugin)) {
      const compatibleVersion =
        plugin.availableVersions?.find(isPluginCompatible) ??
        plugin.availableVersions?.slice(-1).pop();
      if (compatibleVersion) {
        plugins.push({
          ...compatibleVersion,
          availableVersions: plugin?.availableVersions,
        });
      } else {
        plugins.push(plugin);
      }
    } else {
      plugins.push(plugin);
    }
  }
  return plugins;
}
