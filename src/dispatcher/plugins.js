/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';
import type {FlipperPlugin, FlipperDevicePlugin} from '../plugin.js';
import type {State} from '../reducers/plugins';

import React from 'react';
import ReactDOM from 'react-dom';
import * as Flipper from 'flipper';
import {registerPlugins} from '../reducers/plugins';
import {remote} from 'electron';
import {GK} from 'flipper';
import {FlipperBasePlugin} from '../plugin.js';
import {setupMenuBar} from '../MenuBar.js';

type PluginDefinition = {
  name: string,
  out: string,
  gatekeeper?: string,
};

export default (store: Store, logger: Logger) => {
  // expose Flipper and exact globally for dynamically loaded plugins
  window.React = React;
  window.ReactDOM = ReactDOM;
  window.Flipper = Flipper;

  const disabled = checkDisabled();
  const initialPlugins: Array<
    Class<FlipperPlugin<> | FlipperDevicePlugin<>>,
  > = [...getBundledPlugins(), ...getDynamicPlugins()]
    .filter(disabled)
    .filter(checkGK)
    .map(requirePlugin())
    .filter(Boolean);

  store.dispatch(registerPlugins(initialPlugins));

  let state: ?State = null;
  store.subscribe(() => {
    const newState = store.getState().plugins;
    if (state !== newState) {
      setupMenuBar([
        ...newState.devicePlugins.values(),
        ...newState.clientPlugins.values(),
      ]);
    }
    state = newState;
  });
};

function getBundledPlugins(): Array<PluginDefinition> {
  // DefaultPlugins that are included in the bundle.
  // List of defaultPlugins is written at build time
  let bundledPlugins: Array<PluginDefinition> = [];
  try {
    bundledPlugins = window.electronRequire('./defaultPlugins/index.json');
  } catch (e) {}

  return bundledPlugins.map(plugin => ({
    ...plugin,
    out: './' + plugin.out,
  }));
}

export function getDynamicPlugins() {
  let dynamicPlugins: Array<PluginDefinition> = [];
  try {
    // $FlowFixMe process.env not defined in electron API spec
    dynamicPlugins = JSON.parse(remote?.process.env.PLUGINS || '[]');
  } catch (e) {
    console.error(e);
  }
  return dynamicPlugins;
}

export function checkGK(plugin: PluginDefinition): boolean {
  const result = plugin.gatekeeper && !GK.get(plugin.gatekeeper);
  if (plugin.gatekeeper && !result) {
    console.warn(
      'Plugin %s will be ignored as user is not part of the gatekeeper "%s".',
      plugin.name,
      plugin.gatekeeper,
    );
  }
  return !result;
}

export function checkDisabled(): (plugin: PluginDefinition) => boolean {
  let disabledPlugins: Set<string> = new Set();
  try {
    disabledPlugins = new Set(
      // $FlowFixMe process.env not defined in electron API spec
      JSON.parse(remote?.process.env.CONFIG || '{}').disabledPlugins || [],
    );
  } catch (e) {
    console.error(e);
  }

  return (plugin: PluginDefinition) => !disabledPlugins.has(plugin.name);
}

export function requirePlugin(
  requireFunction: Function = window.electronRequire,
) {
  return (
    pluginDefinition: PluginDefinition,
  ): ?Class<FlipperPlugin<> | FlipperDevicePlugin<>> => {
    try {
      const plugin = requireFunction(pluginDefinition.out);
      if (!plugin.prototype instanceof FlipperBasePlugin) {
        throw new Error(`Plugin ${plugin.name} is not a FlipperBasePlugin`);
      }
      return plugin;
    } catch (e) {
      console.error(pluginDefinition, e);
      return null;
    }
  };
}
