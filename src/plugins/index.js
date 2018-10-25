/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {GK} from 'flipper';
import React from 'react';
import ReactDOM from 'react-dom';
import * as Flipper from 'flipper';
import {
  FlipperPlugin,
  FlipperBasePlugin,
  FlipperDevicePlugin,
} from '../plugin.js';
import {remote} from 'electron';

const plugins = new Map();

// expose Flipper and exact globally for dynamically loaded plugins
window.React = React;
window.ReactDOM = ReactDOM;
window.Flipper = Flipper;

const addIfNotAdded = plugin => {
  if (!plugins.has(plugin.name)) {
    plugins.set(plugin.name, plugin);
  }
};

let disabledPlugins = [];
try {
  // $FlowFixMe process.env not defined in electron API spec
  disabledPlugins = JSON.parse(remote?.process.env.CONFIG || '{}').disabledPlugins || [];
} catch (e) {
  console.error(e);
}

// Load dynamic plugins
try {
  // $FlowFixMe process.env not defined in electron API spec
  JSON.parse(remote?.process.env.PLUGINS || '[]').forEach(addIfNotAdded);
} catch (e) {
  console.error(e);
}

// DefaultPlugins that are included in the bundle.
// List of defaultPlugins is written at build time
let bundledPlugins = [];
try {
  bundledPlugins = window.electronRequire('./defaultPlugins/index.json');
} catch (e) {}
bundledPlugins
  .map(plugin => ({
    ...plugin,
    out: './' + plugin.out,
  }))
  .forEach(addIfNotAdded);

const exportedPlugins: Array<Class<FlipperBasePlugin<>>> = Array.from(
  plugins.values(),
)
  .map(plugin => {
    if (
      (plugin.gatekeeper && !GK.get(plugin.gatekeeper)) ||
      disabledPlugins.indexOf(plugin.name) > -1
    ) {
      console.warn(
        'Plugin %s will be ignored as user is not part of the gatekeeper "%s".',
        plugin.name,
        plugin.gatekeeper,
      );
      return null;
    } else {
      try {
        return window.electronRequire(plugin.out);
      } catch (e) {
        console.error(plugin, e);
        return null;
      }
    }
  })
  .filter(Boolean)
  .filter(plugin => plugin.prototype instanceof FlipperBasePlugin)
  .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

export default exportedPlugins;
export const devicePlugins: Array<Class<FlipperDevicePlugin<>>> =
  // $FlowFixMe
  exportedPlugins.filter(
    plugin => plugin.prototype instanceof FlipperDevicePlugin,
  );
export const clientPlugins: Array<Class<FlipperPlugin<>>> =
  // $FlowFixMe
  exportedPlugins.filter(plugin => plugin.prototype instanceof FlipperPlugin);
