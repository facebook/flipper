/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Store} from '../reducers/index';
import type {Logger} from '../fb-interfaces/Logger';
import {
  LoadPluginActionPayload,
  UninstallPluginActionPayload,
  UpdatePluginActionPayload,
  pluginCommandsProcessed,
  SwitchPluginActionPayload,
  PluginCommand,
} from '../reducers/pluginManager';
import {
  getInstalledPlugins,
  cleanupOldInstalledPluginVersions,
  removePlugins,
  ActivatablePluginDetails,
} from 'flipper-plugin-lib';
import {sideEffect} from '../utils/sideEffect';
import {requirePlugin} from './plugins';
import {showErrorNotification} from '../utils/notifications';
import {PluginDefinition} from '../plugin';
import type Client from '../Client';
import {unloadModule} from '../utils/electronModuleCache';
import {
  pluginLoaded,
  pluginUninstalled,
  registerInstalledPlugins,
} from '../reducers/plugins';
import {_SandyPluginDefinition} from 'flipper-plugin';
import {
  setDevicePluginEnabled,
  setDevicePluginDisabled,
  setPluginEnabled,
  setPluginDisabled,
} from '../reducers/connections';
import {deconstructClientId} from '../utils/clientUtils';
import {clearMessageQueue} from '../reducers/pluginMessageQueue';
import {
  getPluginKey,
  isDevicePluginDefinition,
  defaultEnabledBackgroundPlugins,
} from '../utils/pluginUtils';

const maxInstalledPluginVersionsToKeep = 2;

function refreshInstalledPlugins(store: Store) {
  removePlugins(store.getState().plugins.uninstalledPluginNames.values())
    .then(() =>
      cleanupOldInstalledPluginVersions(maxInstalledPluginVersionsToKeep),
    )
    .then(() => getInstalledPlugins())
    .then((plugins) => store.dispatch(registerInstalledPlugins(plugins)));
}

export default (
  store: Store,
  _logger: Logger,
  {runSideEffectsSynchronously}: {runSideEffectsSynchronously: boolean} = {
    runSideEffectsSynchronously: false,
  },
) => {
  // This needn't happen immediately and is (light) I/O work.
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      refreshInstalledPlugins(store);
    });
  }

  const unsubscribeHandlePluginCommands = sideEffect(
    store,
    {
      name: 'handlePluginCommands',
      throttleMs: 0,
      fireImmediately: true,
      runSynchronously: runSideEffectsSynchronously, // Used to simplify writing tests, if "true" passed, the all side effects will be called synchronously and immediately after changes
      noTimeBudgetWarns: true, // These side effects are critical, so we're doing them with zero throttling and want to avoid unnecessary warns
    },
    (state) => state.pluginManager.pluginCommandsQueue,
    processPluginCommandsQueue,
  );
  return async () => {
    unsubscribeHandlePluginCommands();
  };
};

export function processPluginCommandsQueue(
  queue: PluginCommand[],
  store: Store,
) {
  for (const command of queue) {
    switch (command.type) {
      case 'LOAD_PLUGIN':
        loadPlugin(store, command.payload);
        break;
      case 'UNINSTALL_PLUGIN':
        uninstallPlugin(store, command.payload);
        break;
      case 'UPDATE_PLUGIN':
        updatePlugin(store, command.payload);
        break;
      case 'SWITCH_PLUGIN':
        switchPlugin(store, command.payload);
        break;
      default:
        console.error('Unexpected plugin command', command);
        break;
    }
  }
  store.dispatch(pluginCommandsProcessed(queue.length));
}

function loadPlugin(store: Store, payload: LoadPluginActionPayload) {
  try {
    const plugin = requirePlugin(payload.plugin);
    const enablePlugin = payload.enable;
    updatePlugin(store, {plugin, enablePlugin});
  } catch (err) {
    console.error(
      `Failed to load plugin ${payload.plugin.title} v${payload.plugin.version}`,
      err,
    );
    if (payload.notifyIfFailed) {
      showErrorNotification(
        `Failed to load plugin "${payload.plugin.title}" v${payload.plugin.version}`,
      );
    }
  }
}

function uninstallPlugin(store: Store, {plugin}: UninstallPluginActionPayload) {
  try {
    const state = store.getState();
    const clients = state.connections.clients;
    clients.forEach((client) => {
      stopPlugin(client, plugin.id);
    });
    if (!plugin.details.isBundled) {
      unloadPluginModule(plugin.details);
    }
    store.dispatch(pluginUninstalled(plugin.details));
  } catch (err) {
    console.error(
      `Failed to uninstall plugin ${plugin.title} v${plugin.version}`,
      err,
    );
    showErrorNotification(
      `Failed to uninstall plugin "${plugin.title}" v${plugin.version}`,
    );
  }
}

function updatePlugin(store: Store, payload: UpdatePluginActionPayload) {
  const {plugin, enablePlugin} = payload;
  if (isDevicePluginDefinition(plugin)) {
    return updateDevicePlugin(store, plugin, enablePlugin);
  } else {
    return updateClientPlugin(store, plugin, enablePlugin);
  }
}

function getSelectedAppId(store: Store) {
  const {connections} = store.getState();
  const selectedApp = connections.selectedApp
    ? deconstructClientId(connections.selectedApp).app
    : undefined;
  return selectedApp;
}

function switchPlugin(
  store: Store,
  {plugin, selectedApp}: SwitchPluginActionPayload,
) {
  if (isDevicePluginDefinition(plugin)) {
    switchDevicePlugin(store, plugin);
  } else {
    switchClientPlugin(store, plugin, selectedApp);
  }
}

function switchClientPlugin(
  store: Store,
  plugin: PluginDefinition,
  selectedApp: string | undefined,
) {
  selectedApp = selectedApp ?? getSelectedAppId(store);
  if (!selectedApp) {
    return;
  }
  const {connections} = store.getState();
  const clients = connections.clients.filter(
    (client) => client.query.app === selectedApp,
  );
  if (connections.enabledPlugins[selectedApp]?.includes(plugin.id)) {
    clients.forEach((client) => {
      stopPlugin(client, plugin.id);
      const pluginKey = getPluginKey(
        client.id,
        {serial: client.query.device_id},
        plugin.id,
      );
      store.dispatch(clearMessageQueue(pluginKey));
    });
    store.dispatch(setPluginDisabled(plugin.id, selectedApp));
  } else {
    clients.forEach((client) => {
      startPlugin(client, plugin);
    });
    store.dispatch(setPluginEnabled(plugin.id, selectedApp));
  }
}

function switchDevicePlugin(store: Store, plugin: PluginDefinition) {
  const {connections} = store.getState();
  const devicesWithPlugin = connections.devices.filter((d) =>
    d.supportsPlugin(plugin.details),
  );
  if (connections.enabledDevicePlugins.has(plugin.id)) {
    devicesWithPlugin.forEach((d) => {
      d.unloadDevicePlugin(plugin.id);
    });
    store.dispatch(setDevicePluginDisabled(plugin.id));
  } else {
    devicesWithPlugin.forEach((d) => {
      d.loadDevicePlugin(plugin);
    });
    store.dispatch(setDevicePluginEnabled(plugin.id));
  }
}

function updateClientPlugin(
  store: Store,
  plugin: PluginDefinition,
  enable: boolean,
) {
  const clients = store.getState().connections.clients;
  if (enable) {
    const selectedApp = getSelectedAppId(store);
    if (selectedApp) {
      store.dispatch(setPluginEnabled(plugin.id, selectedApp));
    }
  }
  const clientsWithEnabledPlugin = clients.filter((c) => {
    return (
      c.supportsPlugin(plugin.id) &&
      store
        .getState()
        .connections.enabledPlugins[c.query.app]?.includes(plugin.id)
    );
  });
  const previousVersion = store.getState().plugins.clientPlugins.get(plugin.id);
  clientsWithEnabledPlugin.forEach((client) => {
    stopPlugin(client, plugin.id);
  });
  clientsWithEnabledPlugin.forEach((client) => {
    startPlugin(client, plugin, true);
  });
  store.dispatch(pluginLoaded(plugin));
  if (previousVersion) {
    // unload previous version from Electron cache
    unloadPluginModule(previousVersion.details);
  }
}

function updateDevicePlugin(
  store: Store,
  plugin: PluginDefinition,
  enable: boolean,
) {
  if (enable) {
    store.dispatch(setDevicePluginEnabled(plugin.id));
  }
  const connections = store.getState().connections;
  const devicesWithEnabledPlugin = connections.devices.filter((d) =>
    d.supportsPlugin(plugin),
  );
  devicesWithEnabledPlugin.forEach((d) => {
    d.unloadDevicePlugin(plugin.id);
  });
  const previousVersion = store.getState().plugins.devicePlugins.get(plugin.id);
  if (previousVersion) {
    // unload previous version from Electron cache
    unloadPluginModule(previousVersion.details);
  }
  store.dispatch(pluginLoaded(plugin));
  devicesWithEnabledPlugin.forEach((d) => {
    d.loadDevicePlugin(plugin);
  });
}

function startPlugin(
  client: Client,
  plugin: PluginDefinition,
  forceInitBackgroundPlugin: boolean = false,
) {
  client.startPluginIfNeeded(plugin, true);
  // background plugin? connect it needed
  if (
    (forceInitBackgroundPlugin ||
      !defaultEnabledBackgroundPlugins.includes(plugin.id)) &&
    client?.isBackgroundPlugin(plugin.id)
  ) {
    client.initPlugin(plugin.id);
  }
}

function stopPlugin(
  client: Client,
  pluginId: string,
  forceInitBackgroundPlugin: boolean = false,
): boolean {
  if (
    (forceInitBackgroundPlugin ||
      !defaultEnabledBackgroundPlugins.includes(pluginId)) &&
    client?.isBackgroundPlugin(pluginId)
  ) {
    client.deinitPlugin(pluginId);
  }
  // stop sandy plugins
  client.stopPluginIfNeeded(pluginId);
  return true;
}

function unloadPluginModule(plugin: ActivatablePluginDetails) {
  if (plugin.isBundled) {
    // We cannot unload bundled plugin.
    return;
  }
  unloadModule(plugin.entry);
}
