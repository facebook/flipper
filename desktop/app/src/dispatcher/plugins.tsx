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
import {ipcRenderer, shell} from 'electron';
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
import {addNotification} from '../reducers/notifications';
import styled from '@emotion/styled';
import {tryCatchReportPluginFailures, reportUsage} from '../utils/metrics';
import * as FlipperPluginSDK from 'flipper-plugin';
import Immer from 'immer';

// eslint-disable-next-line import/no-unresolved
import getPluginIndex from '../utils/getDefaultPluginsIndex';
import {SandyPluginDefinition} from 'flipper-plugin';

const Paragraph = styled.p({
  marginBottom: '0.1em',
});

export default (store: Store, logger: Logger) => {
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

  const defaultPluginsIndex = getPluginIndex();

  const initialPlugins: PluginDefinition[] = filterNewestVersionOfEachPlugin(
    getBundledPlugins(),
    getDynamicPlugins(),
  )
    .map(reportVersion)
    .filter(checkDisabled(disabledPlugins))
    .filter(checkGK(gatekeepedPlugins))
    .map(requirePlugin(failedPlugins, defaultPluginsIndex))
    .filter(notNull);

  store.dispatch(addGatekeepedPlugins(gatekeepedPlugins));
  store.dispatch(addDisabledPlugins(disabledPlugins));
  store.dispatch(addFailedPlugins(failedPlugins));
  store.dispatch(registerPlugins(initialPlugins));
  const deprecatedSpecPlugins = initialPlugins.filter(
    (p) => !p.isDefault && p.details.specVersion === 1,
  );
  for (const plugin of deprecatedSpecPlugins) {
    store.dispatch(
      addNotification({
        pluginId: plugin.id,
        client: null,
        notification: {
          id: `plugin-spec-v1-deprecation-${plugin.packageName}`,
          title: `Plugin "${plugin.title}" will stop working after version 0.48 of Flipper released, because it is packaged using the deprecated format.`,
          message: (
            <>
              <Paragraph>
                Please try to install a newer version of this plugin packaged
                using "Install Plugins" tab on "Manage Plugins" form.
              </Paragraph>
              <Paragraph>
                If the latest version of the plugin is still packaged in the old
                format, please contact the author and consider raising a pull
                request for upgrading the plugin. You can find contact details
                on the package page&nbsp;
                <a
                  href={`#`}
                  onClick={() =>
                    shell.openExternal(
                      `https://www.npmjs.com/package/${plugin.packageName}`,
                    )
                  }>
                  https://www.npmjs.com/package/{plugin.packageName}
                </a>
                .
              </Paragraph>
              <Paragraph>
                If you are the author of this plugin, please migrate your plugin
                to the new format, and publish new version of it. See&nbsp;
                <a
                  href={`#`}
                  onClick={() =>
                    shell.openExternal(
                      'https://fbflipper.com/docs/extending/js-setup#migration-to-the-new-plugin-specification',
                    )
                  }>
                  https://fbflipper.com/docs/extending/js-setup#migration-to-the-new-plugin-specification
                </a>
                &nbsp;on how to migrate the plugin. See&nbsp;
                <a
                  href={`#`}
                  onClick={() =>
                    shell.openExternal(
                      'https://fbflipper.com/docs/extending/js-setup#package-format',
                    )
                  }>
                  https://fbflipper.com/docs/extending/js-setup#package-format
                </a>
                &nbsp;for details on plugin package format.
              </Paragraph>
            </>
          ),
          severity: 'error',
          timestamp: Date.now(),
          category: `Plugin Spec V1 Deprecation`,
        },
      }),
    );
  }

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

export function getDynamicPlugins() {
  let dynamicPlugins: Array<PluginDetails> = [];
  try {
    dynamicPlugins = ipcRenderer.sendSync('get-dynamic-plugins');
  } catch (e) {
    console.error(e);
  }
  return dynamicPlugins;
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

export const requirePlugin = (
  failedPlugins: Array<[PluginDetails, string]>,
  defaultPluginsIndex: any,
  reqFn: Function = global.electronRequire,
) => {
  return (pluginDetails: PluginDetails): PluginDefinition | null => {
    try {
      return tryCatchReportPluginFailures(
        () => requirePluginInternal(pluginDetails, defaultPluginsIndex, reqFn),
        'plugin:load',
        pluginDetails.id,
      );
    } catch (e) {
      failedPlugins.push([pluginDetails, e.message]);
      console.error(`Plugin ${pluginDetails.id} failed to load`, e);
      return null;
    }
  };
};

const requirePluginInternal = (
  pluginDetails: PluginDetails,
  defaultPluginsIndex: any,
  reqFn: Function = global.electronRequire,
) => {
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
