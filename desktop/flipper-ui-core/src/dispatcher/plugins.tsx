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
import {ActivatablePluginDetails, ConcretePluginDetails} from 'flipper-common';
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
import {
  AbstractPluginInitializer,
  getRenderHostInstance,
  setGlobalObject,
} from 'flipper-frontend-core';
import * as deprecatedExports from '../deprecated-exports';
import {getAppVersion} from '../utils/info';

class UIPluginInitializer extends AbstractPluginInitializer {
  constructor(private readonly store: Store) {
    super();
  }

  async init() {
    await super.init();

    const classicPlugins = this._initialPlugins.filter(
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

    this.store.dispatch(registerBundledPlugins(this.bundledPlugins));
    this.store.dispatch(registerLoadedPlugins(this.loadedPlugins));
    this.store.dispatch(addGatekeepedPlugins(this.gatekeepedPlugins));
    this.store.dispatch(addDisabledPlugins(this.disabledPlugins));
    this.store.dispatch(addFailedPlugins(this.failedPlugins));
    this.store.dispatch(registerPlugins(this._initialPlugins));
    this.store.dispatch(pluginsInitialized());
  }

  protected async getFlipperVersion() {
    return getAppVersion();
  }

  public requirePluginImpl(pluginDetails: ActivatablePluginDetails) {
    return requirePluginInternal(this.defaultPluginsIndex, pluginDetails);
  }

  protected loadMarketplacePlugins() {
    const marketplacePlugins = selectCompatibleMarketplaceVersions(
      this.store.getState().plugins.marketplacePlugins,
    );
    this.store.dispatch(registerMarketplacePlugins(marketplacePlugins));
  }

  protected loadUninstalledPluginNames() {
    return this.store.getState().plugins.uninstalledPluginNames;
  }
}

let uiPluginInitializer: UIPluginInitializer;
export default async (store: Store, _logger: Logger) => {
  setGlobalObject({
    React,
    ReactDOM,
    ReactDOMClient,
    ReactIs,
    Flipper: deprecatedExports,
    FlipperPlugin: FlipperPluginSDK,
    Immer,
    antd,
    emotion_styled,
    antdesign_icons,
  });

  uiPluginInitializer = new UIPluginInitializer(store);
  await uiPluginInitializer.init();
};

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
    () => uiPluginInitializer.requirePluginImpl(pluginDetails),
    'plugin:load',
    pluginDetails.id,
  );
};

const isSandyPlugin = (pluginDetails: ActivatablePluginDetails) => {
  return !!pluginDetails.flipperSDKVersion;
};

const requirePluginInternal = async (
  defaultPluginsIndex: any,
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
