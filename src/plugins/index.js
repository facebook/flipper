/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import {GK} from 'sonar';
import React from 'react';
import ReactDOM from 'react-dom';
import * as Sonar from 'sonar';
import {SonarBasePlugin} from '../plugin.js';

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

export default Array.from(plugins.values())
  .map(plugin => {
    if (
      !plugin.gatekeeper ||
      (plugin.gatekeeper && GK.get(plugin.gatekeeper))
    ) {
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
