/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import type {
  State,
  StatePluginInfo,
  StatePlugins,
  StateClientPlugins,
} from './init.js';
import type {SonarBasePlugin} from 'sonar';
import type Application from './init.js';
import {devicePlugins} from './device-plugins/index.js';
import {SonarPlugin, SonarDevicePlugin} from 'sonar';
import {PluginStateContainer} from './plugin.js';
import BaseDevice from './devices/BaseDevice.js';
import plugins from './plugins/index.js';
import {Client} from './server.js';

const invariant = require('invariant');

type ActivatePluginAction = {|
  appKey: string,
  pluginKey: string,
|};

type TeardownClientAction = {|
  appKey: string,
|};

export function ActivatePlugin(
  app: Application,
  state: State,
  {appKey, pluginKey}: ActivatePluginAction,
) {
  const {activePluginKey, activeAppKey} = state;

  // get currently active plugin
  const activeClientPlugins: ?StateClientPlugins =
    activeAppKey != null ? state.plugins[activeAppKey] : null;
  const activePluginInfo: ?StatePluginInfo =
    activePluginKey != null && activeClientPlugins
      ? activeClientPlugins[activePluginKey]
      : null;

  // check if this plugin is already active
  if (
    activePluginKey === pluginKey &&
    activeAppKey === appKey &&
    activePluginInfo &&
    activePluginInfo.plugin
  ) {
    // this is a noop
    return state;
  }

  // produce new plugins object
  const newPluginsState: StatePlugins = {
    ...state.plugins,
  };

  // check if the currently active plugin needs to be torn down after being deactivated
  if (
    activeAppKey != null &&
    activePluginKey != null &&
    activePluginInfo &&
    activeClientPlugins
  ) {
    const activePlugin: ?SonarBasePlugin<> = activePluginInfo.plugin;
    if (activePlugin && !activePlugin.constructor.persist) {
      // teardown the currently active plugin
      activePlugin._teardown();

      // and remove it's plugin instance so next time it's made active it'll be reloaded
      newPluginsState[activeAppKey] = {
        ...activeClientPlugins,
        [activePluginKey]: {
          plugin: null,
          state: activePluginInfo.state,
        },
      };
    }
  }

  // get the plugin state associated with the new client
  const newClientPluginsState: StateClientPlugins = {
    ...(newPluginsState[appKey] || {}),
  };
  newPluginsState[appKey] = newClientPluginsState;

  // find the Plugin constructor with this key
  let Plugin: Class<SonarBasePlugin<>>;
  for (const FindPlugin of plugins) {
    if (FindPlugin.id === pluginKey) {
      Plugin = FindPlugin;
    }
  }
  for (const FindPlugin of devicePlugins) {
    if (FindPlugin.id === pluginKey) {
      Plugin = FindPlugin;
    }
  }
  invariant(Plugin, 'expected plugin');

  // get target, this could be an app connection or a device
  const clientInfo = state.server.connections.get(appKey);
  let target: Client | BaseDevice;
  if (clientInfo) {
    target = clientInfo.client;
    invariant(
      // $FlowFixMe prototype not known
      Plugin.prototype instanceof SonarPlugin,
      'expected plugin to be an app Plugin',
    );
  } else {
    target = state.devices[appKey];
    invariant(
      // $FlowFixMe prototype not known
      Plugin.prototype instanceof SonarDevicePlugin,
      'expected plugin to be DevicePlugin',
    );
  }
  invariant(target, 'expected target');

  // initialise the client if it hasn't alreadu been
  const thisPluginState: ?StatePluginInfo = newClientPluginsState[pluginKey];
  if (!thisPluginState || !thisPluginState.plugin) {
    const plugin = new Plugin();

    // setup plugin, this is to avoid consumers having to pass args to super
    plugin._setup(target, app);

    // if we already have state for this plugin then rehydrate it
    if (thisPluginState && thisPluginState.state) {
      plugin.state = thisPluginState.state;
    }

    // init plugin - setup broadcasts, initial messages etc
    plugin._init();

    newClientPluginsState[pluginKey] = new PluginStateContainer(
      plugin,
      plugin.state,
    );
  }

  return {
    activeAppKey: appKey,
    activePluginKey: pluginKey,
    plugins: newPluginsState,
  };
}

export function TeardownClient(
  app: Application,
  state: State,
  {appKey}: TeardownClientAction,
) {
  const allPlugins: StatePlugins = {...state.plugins};

  // teardown all plugins
  const clientPlugins: StateClientPlugins = allPlugins[appKey];
  for (const pluginKey in clientPlugins) {
    const {plugin} = clientPlugins[pluginKey];
    if (plugin) {
      plugin._teardown();
    }
  }

  // remove this client
  delete allPlugins[appKey];

  return {
    activeAppKey: state.activeAppKey === appKey ? null : state.activeAppKey,
    activePluginKey:
      state.activeAppKey === appKey ? null : state.activePluginKey,
    plugins: allPlugins,
  };
}
