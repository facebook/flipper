/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {GK} from 'sonar';
import React from 'react';
import ReactDOM from 'react-dom';
import * as Sonar from 'sonar';
import {SonarPlugin, SonarBasePlugin} from '../plugin.js';

const plugins = new Map();

// expose Sonar and exact globally for dynamically loaded plugins
window.React = React;
window.ReactDOM = ReactDOM;
window.Sonar = Sonar;

const addIfNotAdded = plugin => {
  if (!plugins.has(plugin.name)) {
    plugins.set(plugin.name, plugin);
  }
};

let disabledPlugins = [];
try {
  disabledPlugins =
    JSON.parse(window.process.env.CONFIG || '{}').disabledPlugins || [];
} catch (e) {
  console.error(e);
}

// Load dynamic plugins
try {
  JSON.parse(window.process.env.PLUGINS || '[]').forEach(addIfNotAdded);
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

const exportedPlugins: Array<Class<SonarPlugin<>>> = Array.from(
  plugins.values(),
)
  .map(plugin => {
    if (
      (plugin.gatekeeper && !GK.get(plugin.gatekeeper)) ||
      disabledPlugins.indexOf(plugin.name) > -1
    ) {
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
  .filter(plugin => plugin.prototype instanceof SonarBasePlugin);

export default exportedPlugins;
