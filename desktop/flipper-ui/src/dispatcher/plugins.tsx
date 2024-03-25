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
  FlipperServerConfig,
  FlipperServerDisconnectedError,
  FlipperServerTimeoutError,
  InstalledPluginDetails,
  isProduction,
  Logger,
  MarketplacePluginDetails,
  notNull,
  reportUsage,
  tryCatchReportPluginFailuresAsync,
} from 'flipper-common';
import {PluginDefinition} from '../plugin';
import React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import ReactDOM from 'react-dom';
import ReactDOMClient from 'react-dom/client';
import ReactIs from 'react-is';
import {
  registerPlugins,
  addGatekeepedPlugins,
  addDisabledPlugins,
  addFailedPlugins,
  registerLoadedPlugins,
  registerMarketplacePlugins,
  pluginsInitialized,
} from '../reducers/plugins';
import {FlipperBasePlugin} from '../plugin';
import {ActivatablePluginDetails} from 'flipper-common';
import * as FlipperPluginSDK from 'flipper-plugin';
import {_SandyPluginDefinition} from 'flipper-plugin';
import * as Immer from 'immer';
import * as antd from 'antd';
import * as emotion_styled from '@emotion/styled';
import * as emotion_css from '@emotion/css';
import * as antdesign_icons from '@ant-design/icons';
import isPluginCompatible from '../utils/isPluginCompatible';
import {createSandyPluginWrapper} from '../utils/createSandyPluginWrapper';
import * as deprecatedExports from '../deprecated-exports';
import {getFlipperServer, getFlipperServerConfig} from '../flipperServer';
import {GK} from '../utils/GK';
import pMap from 'p-map';
import {getLatestCompatibleVersionOfEachPlugin} from '../utils/pluginUtils';

// this list should match `replace-flipper-requires.tsx` and the `builtInModules` in `desktop/.eslintrc`
export interface GlobalObject {
  React: any;
  ReactDOM: any;
  ReactDOMClient: any;
  ReactIs: any;
  Flipper: any;
  FlipperPlugin: any;
  Immer: any;
  antd: any;
  emotion_styled: any;
  emotion_css: any;
  antdesign_icons: any;
  ReactJsxRuntime: any;
}

declare module globalThis {
  let React: any;
  let ReactDOM: any;
  let ReactDOMClient: any;
  let ReactIs: any;
  let Flipper: any;
  let FlipperPlugin: any;
  let Immer: any;
  let antd: any;
  let emotion_styled: any;
  let emotion_css: any;
  let antdesign_icons: any;
  let ReactJsxRuntime: any;
}

const setGlobalObject = (replacements: GlobalObject) => {
  for (const [name, module] of Object.entries(replacements)) {
    globalThis[name as keyof GlobalObject] = module;
  }
};

export default async (store: Store, _logger: Logger) => {
  let FlipperPlugin = FlipperPluginSDK;
  if (!GK('flipper_power_search')) {
    FlipperPlugin = {
      ...FlipperPlugin,
      MasterDetail: FlipperPlugin.MasterDetailLegacy as any,
      DataTable: FlipperPlugin.DataTableLegacy as any,
    };
  }

  setGlobalObject({
    React,
    ReactDOM,
    ReactDOMClient,
    ReactIs,
    Flipper: deprecatedExports,
    FlipperPlugin,
    Immer,
    antd,
    emotion_styled,
    emotion_css,
    antdesign_icons,
    ReactJsxRuntime,
  });

  const marketplacePlugins = selectCompatibleMarketplaceVersions(
    store.getState().plugins.marketplacePlugins,
  );
  store.dispatch(registerMarketplacePlugins(marketplacePlugins));

  const uninstalledPluginNames =
    store.getState().plugins.uninstalledPluginNames;

  const allLocalVersions = [...(await getDynamicPlugins())].filter(
    (p) => !uninstalledPluginNames.has(p.name),
  );

  const loadedPlugins =
    getLatestCompatibleVersionOfEachPlugin(allLocalVersions);

  const disabledPlugins: Array<ActivatablePluginDetails> = [];
  const gatekeepedPlugins: Array<ActivatablePluginDetails> = [];
  const pluginsToLoad = loadedPlugins
    .map(reportVersion)
    .filter(checkDisabled(disabledPlugins, getFlipperServerConfig()))
    .filter(checkGK(gatekeepedPlugins));

  const failedPlugins: Array<[ActivatablePluginDetails, string]> = [];
  const loader = createRequirePluginFunction(requirePluginInternal)(
    failedPlugins,
  );
  const initialPlugins = (await pMap(pluginsToLoad, loader)).filter(notNull);

  const classicPlugins = initialPlugins.filter(
    (p) => !isSandyPlugin(p.details),
  );
  if (
    getFlipperServerConfig().env.NODE_ENV !== 'test' &&
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

  store.dispatch(registerLoadedPlugins(loadedPlugins));
  store.dispatch(addGatekeepedPlugins(gatekeepedPlugins));
  store.dispatch(addDisabledPlugins(disabledPlugins));
  store.dispatch(addFailedPlugins(failedPlugins));
  store.dispatch(registerPlugins(initialPlugins));
  store.dispatch(pluginsInitialized());
};

export const requirePlugin = (pluginDetails: ActivatablePluginDetails) =>
  wrapRequirePlugin(requirePluginInternal)(pluginDetails);

export const requirePluginInternal = async (
  pluginDetails: ActivatablePluginDetails,
): Promise<PluginDefinition> => {
  const path = (pluginDetails as InstalledPluginDetails).entry;

  const source = await getFlipperServer().exec('plugin-source', path);

  let js = source.js;
  // append source url (to make sure a file entry shows up in the debugger)
  js += `\n//# sourceURL=file://${path}`;
  if (isProduction()) {
    // and source map url (to get source code if available)
    js += `\n//# sourceMappingURL=file://${path}.map`;
  }

  // Plugins are compiled as typical CJS modules, referring to the global
  // 'module', which we'll make available by loading the source into a closure that captures 'module'.
  // Note that we use 'eval', and not 'new Function', because the latter will cause the source maps
  // to be off by two lines (as the function declaration uses two lines in the generated source)
  // eslint-disable-next-line no-eval
  const cjsLoader = eval(`(module) => {${js}\n}`);
  const theModule = {exports: {}};
  cjsLoader(theModule);

  const requiredPlugin = {plugin: theModule.exports as any, css: source.css};
  if (!requiredPlugin || !requiredPlugin.plugin) {
    throw new Error(
      `Failed to obtain plugin source for: ${pluginDetails.name}`,
    );
  }
  if (isSandyPlugin(pluginDetails)) {
    // Sandy plugin
    return new _SandyPluginDefinition(
      pluginDetails,
      requiredPlugin.plugin,
      requiredPlugin.css,
    );
  } else {
    // Classic plugin
    let plugin = requiredPlugin.plugin;
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
      const result = GK(plugin.gatekeeper);
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
  config: FlipperServerConfig,
) => {
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
          (e instanceof FlipperServerDisconnectedError &&
            e.reason === 'ws-close') ||
          e instanceof FlipperServerTimeoutError
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
