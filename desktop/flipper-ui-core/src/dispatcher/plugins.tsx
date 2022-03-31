/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Store} from '../reducers/index';
import {
  InstalledPluginDetails,
  Logger,
  tryCatchReportPluginFailuresAsync,
} from 'flipper-common';
import {PluginDefinition} from '../plugin';
import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMClient from 'react-dom/client';
import ReactIs from 'react-is';
import {
  registerPlugins,
  addGatekeepedPlugins,
  addDisabledPlugins,
  addFailedPlugins,
  registerLoadedPlugins,
  registerBundledPlugins,
  registerMarketplacePlugins,
  MarketplacePluginDetails,
  pluginsInitialized,
} from '../reducers/plugins';
import {FlipperBasePlugin} from '../plugin';
import {notNull} from '../utils/typeUtils';
import {
  ActivatablePluginDetails,
  BundledPluginDetails,
  ConcretePluginDetails,
} from 'flipper-common';
import {reportUsage} from 'flipper-common';
import * as FlipperPluginSDK from 'flipper-plugin';
import {_SandyPluginDefinition} from 'flipper-plugin';
import * as Immer from 'immer';
import * as antd from 'antd';
import * as emotion_styled from '@emotion/styled';
import * as antdesign_icons from '@ant-design/icons';

import {isDevicePluginDefinition} from '../utils/pluginUtils';
import isPluginCompatible from '../utils/isPluginCompatible';
import isPluginVersionMoreRecent from '../utils/isPluginVersionMoreRecent';
import {createSandyPluginWrapper} from '../utils/createSandyPluginWrapper';
import {getRenderHostInstance} from '../RenderHost';
import pMap from 'p-map';
import * as deprecatedExports from '../deprecated-exports';

let defaultPluginsIndex: any = null;

export default async (store: Store, _logger: Logger) => {
  // expose Flipper and exact globally for dynamically loaded plugins
  const globalObject = (function (this: any) {
    return this;
  })();

  // this list should match `replace-flipper-requires.tsx` and the `builtInModules` in `desktop/.eslintrc`
  globalObject.React = React;
  globalObject.ReactDOM = ReactDOM;
  globalObject.ReactDOMClient = ReactDOMClient;
  globalObject.ReactIs = ReactIs;
  globalObject.Flipper = deprecatedExports;
  globalObject.FlipperPlugin = FlipperPluginSDK;
  globalObject.Immer = Immer;
  globalObject.antd = antd;
  globalObject.emotion_styled = emotion_styled;
  globalObject.antdesign_icons = antdesign_icons;

  const gatekeepedPlugins: Array<ActivatablePluginDetails> = [];
  const disabledPlugins: Array<ActivatablePluginDetails> = [];
  const failedPlugins: Array<[ActivatablePluginDetails, string]> = [];

  defaultPluginsIndex = getRenderHostInstance().loadDefaultPlugins();

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

  const pluginsToLoad = loadedPlugins
    .map(reportVersion)
    .filter(checkDisabled(disabledPlugins))
    .filter(checkGK(gatekeepedPlugins));
  const loader = createRequirePluginFunction(failedPlugins);

  const initialPlugins: PluginDefinition[] = (
    await pMap(pluginsToLoad, loader)
  ).filter(notNull);

  const classicPlugins = initialPlugins.filter(
    (p) => !isSandyPlugin(p.details),
  );
  if (
    getRenderHostInstance().serverConfig.env.NODE_ENV !== 'test' &&
    classicPlugins.length
  ) {
    console.warn(
      `${
        classicPlugins.length
      } plugin(s) were loaded in legacy mode. Please visit https://fbflipper.com/docs/extending/sandy-migration to learn how to migrate these plugins to the new Sandy architecture: \n${classicPlugins
        .map((p) => `${p.title} (id: ${p.id})`)
        .sort()
        .join('\n')}`,
    );
  }

  store.dispatch(registerBundledPlugins(bundledPlugins));
  store.dispatch(registerLoadedPlugins(loadedPlugins));
  store.dispatch(addGatekeepedPlugins(gatekeepedPlugins));
  store.dispatch(addDisabledPlugins(disabledPlugins));
  store.dispatch(addFailedPlugins(failedPlugins));
  store.dispatch(registerPlugins(initialPlugins));
  store.dispatch(pluginsInitialized());
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
  if (getRenderHostInstance().serverConfig.env.NODE_ENV === 'test') {
    return [];
  }
  try {
    // defaultPlugins that are included in the Flipper distributive.
    // List of default bundled plugins is written at build time to defaultPlugins/bundled.json.
    return await getRenderHostInstance().flipperServer!.exec(
      'plugins-get-bundled-plugins',
    );
  } catch (e) {
    console.error('Failed to load list of bundled plugins', e);
    return [];
  }
}

export async function getDynamicPlugins(): Promise<InstalledPluginDetails[]> {
  try {
    return await getRenderHostInstance().flipperServer!.exec(
      'plugins-load-dynamic-plugins',
    );
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
      const result = getRenderHostInstance().GK(plugin.gatekeeper);
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
  const config = getRenderHostInstance().serverConfig;
  let enabledList: Set<string> | null = null;
  let disabledList: Set<string> = new Set();
  try {
    if (config.env.FLIPPER_ENABLED_PLUGINS) {
      enabledList = new Set<string>(
        config.env.FLIPPER_ENABLED_PLUGINS.split(','),
      );
    }
    disabledList = new Set(config.processConfig.disabledPlugins);
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
) => {
  return async (
    pluginDetails: ActivatablePluginDetails,
  ): Promise<PluginDefinition | null> => {
    try {
      const pluginDefinition = await requirePlugin(pluginDetails);
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
): Promise<PluginDefinition> => {
  reportUsage(
    'plugin:load',
    {
      version: pluginDetails.version,
    },
    pluginDetails.id,
  );
  return tryCatchReportPluginFailuresAsync(
    () => requirePluginInternal(pluginDetails),
    'plugin:load',
    pluginDetails.id,
  );
};

const isSandyPlugin = (pluginDetails: ActivatablePluginDetails) => {
  return !!pluginDetails.flipperSDKVersion;
};

const requirePluginInternal = async (
  pluginDetails: ActivatablePluginDetails,
): Promise<PluginDefinition> => {
  let plugin = pluginDetails.isBundled
    ? defaultPluginsIndex[pluginDetails.name]
    : await getRenderHostInstance().requirePlugin(pluginDetails.entry);
  if (!plugin) {
    throw new Error(
      `Failed to obtain plugin source for: ${pluginDetails.name}`,
    );
  }
  if (isSandyPlugin(pluginDetails)) {
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
