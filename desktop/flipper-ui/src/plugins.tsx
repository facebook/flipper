/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  InstalledPluginDetails,
  tryCatchReportPluginFailuresAsync,
  notNull,
  FlipperServerDisconnectedError,
} from 'flipper-common';
import {ActivatablePluginDetails, ConcretePluginDetails} from 'flipper-common';
import {reportUsage} from 'flipper-common';
import {_SandyPluginDefinition} from 'flipper-plugin';
import isPluginCompatible from './utils/isPluginCompatible';
import isPluginVersionMoreRecent from './utils/isPluginVersionMoreRecent';
import {getRenderHostInstance} from './RenderHost';
import pMap from 'p-map';
import {getFlipperServer} from './flipperServer';

export abstract class AbstractPluginInitializer {
  protected gatekeepedPlugins: Array<ActivatablePluginDetails> = [];
  protected disabledPlugins: Array<ActivatablePluginDetails> = [];
  protected failedPlugins: Array<[ActivatablePluginDetails, string]> = [];
  protected loadedPlugins: Array<InstalledPluginDetails> = [];
  protected _initialPlugins: _SandyPluginDefinition[] = [];

  async init() {
    this._initialPlugins = await this._init();
  }

  get initialPlugins(): ReadonlyArray<_SandyPluginDefinition> {
    return this._initialPlugins;
  }

  get requirePlugin() {
    return createRequirePluginFunction(this.requirePluginImpl.bind(this));
  }

  protected async _init(): Promise<_SandyPluginDefinition[]> {
    this.loadMarketplacePlugins();
    const uninstalledPluginNames = this.loadUninstalledPluginNames();
    const allLocalVersions = await this.loadAllLocalVersions(
      uninstalledPluginNames,
    );
    const pluginsToLoad = await this.filterAllLocalVersions(allLocalVersions);
    const initialPlugins = await this.loadPlugins(pluginsToLoad);
    return initialPlugins;
  }

  protected abstract getFlipperVersion(): Promise<string>;

  protected abstract requirePluginImpl(
    pluginDetails: ActivatablePluginDetails,
  ): Promise<_SandyPluginDefinition>;

  protected loadMarketplacePlugins() {}
  protected loadUninstalledPluginNames(): Set<string> {
    return new Set();
  }
  protected async loadAllLocalVersions(
    uninstalledPluginNames: Set<string>,
  ): Promise<InstalledPluginDetails[]> {
    const allLocalVersions = [...(await getDynamicPlugins())].filter(
      (p) => !uninstalledPluginNames.has(p.name),
    );

    return allLocalVersions;
  }
  protected async filterAllLocalVersions(
    allLocalVersions: InstalledPluginDetails[],
  ): Promise<ActivatablePluginDetails[]> {
    const loadedPlugins =
      getLatestCompatibleVersionOfEachPlugin(allLocalVersions);
    this.loadedPlugins = loadedPlugins;

    const pluginsToLoad = loadedPlugins
      .map(reportVersion)
      .filter(checkDisabled(this.disabledPlugins))
      .filter(checkGK(this.gatekeepedPlugins));

    return pluginsToLoad;
  }

  protected async loadPlugins(pluginsToLoad: ActivatablePluginDetails[]) {
    const loader = this.requirePlugin(this.failedPlugins);
    const initialPlugins: _SandyPluginDefinition[] = (
      await pMap(pluginsToLoad, loader)
    ).filter(notNull);
    return initialPlugins;
  }
}

export function isDevicePluginDefinition(
  definition: _SandyPluginDefinition,
): boolean {
  return definition.isDevicePlugin;
}

export function reportVersion(pluginDetails: ActivatablePluginDetails) {
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

export async function getDynamicPlugins(): Promise<InstalledPluginDetails[]> {
  try {
    return await getFlipperServer().exec('plugins-load-dynamic-plugins');
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

export const createRequirePluginFunction =
  (
    requirePluginImpl: (
      pluginDetails: ActivatablePluginDetails,
    ) => Promise<_SandyPluginDefinition>,
  ) =>
  (failedPlugins: Array<[ActivatablePluginDetails, string]>) => {
    return async (
      pluginDetails: ActivatablePluginDetails,
    ): Promise<_SandyPluginDefinition | null> => {
      try {
        const requirePluginImplWrapped = wrapRequirePlugin(requirePluginImpl);
        const pluginDefinition = await requirePluginImplWrapped(pluginDetails);
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

        let severity: 'error' | 'warn' = 'error';
        if (
          e instanceof FlipperServerDisconnectedError &&
          e.reason === 'ws-close'
        ) {
          severity = 'warn';
        }
        console[severity](`Plugin ${pluginDetails.id} failed to load`, e);
        return null;
      }
    };
  };

export const wrapRequirePlugin =
  (
    requirePluginImpl: (
      pluginDetails: ActivatablePluginDetails,
    ) => Promise<_SandyPluginDefinition>,
  ) =>
  (
    pluginDetails: ActivatablePluginDetails,
  ): Promise<_SandyPluginDefinition> => {
    reportUsage(
      'plugin:load',
      {
        version: pluginDetails.version,
      },
      pluginDetails.id,
    );
    return tryCatchReportPluginFailuresAsync(
      () => requirePluginImpl(pluginDetails),
      'plugin:load',
      pluginDetails.id,
    );
  };

export const isSandyPlugin = (pluginDetails: ActivatablePluginDetails) => {
  return !!pluginDetails.flipperSDKVersion;
};
