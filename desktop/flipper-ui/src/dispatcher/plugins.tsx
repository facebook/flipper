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
  isProduction,
  Logger,
  MarketplacePluginDetails,
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
import {getAppVersion} from '../utils/info';
import {
  AbstractPluginInitializer,
  isSandyPlugin,
  wrapRequirePlugin,
} from '../plugins';
import {getRenderHostInstance} from '../RenderHost';
import {setGlobalObject} from '../globalObject';
import {getFlipperServer, getFlipperServerConfig} from '../flipperServer';

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
    return requirePluginInternal(pluginDetails);
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
  let FlipperPlugin = FlipperPluginSDK;
  if (!getRenderHostInstance().GK('flipper_power_search')) {
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

  uiPluginInitializer = new UIPluginInitializer(store);
  await uiPluginInitializer.init();
};

export const requirePlugin = (pluginDetails: ActivatablePluginDetails) =>
  wrapRequirePlugin(
    uiPluginInitializer!.requirePluginImpl.bind(uiPluginInitializer),
  )(pluginDetails);

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
  const cjsLoader = eval('(module) => {' + js + '\n}');
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
