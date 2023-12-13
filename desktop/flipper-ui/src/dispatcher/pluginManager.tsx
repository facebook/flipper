/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Store} from '../reducers/index';
import type {Logger} from 'flipper-common';
import {
  LoadPluginActionPayload,
  UninstallPluginActionPayload,
  UpdatePluginActionPayload,
  pluginCommandsProcessed,
  SwitchPluginActionPayload,
  PluginCommand,
} from '../reducers/pluginManager';
import {sideEffect} from '../utils/sideEffect';
import {requirePlugin} from './plugins';
import {showErrorNotification} from '../utils/notifications';
import {PluginDefinition} from '../plugin';
import type Client from '../Client';
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
  getClientsByAppName,
  getAllClients,
} from '../reducers/connections';
import {deconstructClientId} from 'flipper-common';
import {clearMessageQueue} from '../reducers/pluginMessageQueue';
import {
  isDevicePluginDefinition,
  defaultEnabledBackgroundPlugins,
} from '../utils/pluginUtils';
import {getPluginKey} from '../utils/pluginKey';
import {getFlipperServer} from '../flipperServer';

async function refreshInstalledPlugins(store: Store) {
  const flipperServer = getFlipperServer();
  if (!flipperServer) {
    throw new Error('Flipper Server not ready');
  }
  await flipperServer.exec(
    'plugins-remove-plugins',
    Array.from(store.getState().plugins.uninstalledPluginNames.values()),
  );
  const plugins = await flipperServer.exec('plugins-get-installed-plugins');
  return store.dispatch(registerInstalledPlugins(plugins));
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
      refreshInstalledPlugins(store).catch((err) =>
        console.error('Failed to refresh installed plugins:', err),
      );
    });
  }

  let running = false;
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
    async (_queue: PluginCommand[], store: Store) => {
      // To make sure all commands are running in order, and not kicking off parallel command
      // processing when new commands arrive (sideEffect doesn't await)
      // we keep the 'running' flag, and keep running in a loop until the commandQueue is empty,
      // to make sure any commands that have arrived during execution are executed
      if (running) {
        return; // will be picked up in while(true) loop
      }
      running = true;
      try {
        while (true) {
          const remaining = store.getState().pluginManager.pluginCommandsQueue;
          if (!remaining.length) {
            return; // done
          }
          await processPluginCommandsQueue(remaining, store);
          store.dispatch(pluginCommandsProcessed(remaining.length));
        }
      } finally {
        running = false;
      }
    },
  );
  return async () => {
    unsubscribeHandlePluginCommands();
  };
};

export async function awaitPluginCommandQueueEmpty(store: Store) {
  if (store.getState().pluginManager.pluginCommandsQueue.length === 0) {
    return;
  }
  return new Promise<void>((resolve) => {
    const unsubscribe = store.subscribe(() => {
      if (store.getState().pluginManager.pluginCommandsQueue.length === 0) {
        unsubscribe();
        resolve();
      }
    });
  });
}

async function processPluginCommandsQueue(
  queue: PluginCommand[],
  store: Store,
) {
  for (const command of queue) {
    try {
      switch (command.type) {
        case 'LOAD_PLUGIN':
          await loadPlugin(store, command.payload);
          break;
        case 'UNINSTALL_PLUGIN':
          uninstallPlugin(store, command.payload);
          break;
        case 'SWITCH_PLUGIN':
          switchPlugin(store, command.payload);
          break;
        default:
          console.error('Unexpected plugin command', command);
          break;
      }
    } catch (e) {
      // make sure that upon failure the command is still marked processed to avoid
      // unending loops!
      console.error('Failed to process command', command);
    }
  }
}

async function loadPlugin(store: Store, payload: LoadPluginActionPayload) {
  try {
    const plugin = await requirePlugin(payload.plugin);
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

function getSelectedAppName(store: Store) {
  const {connections} = store.getState();
  const selectedAppId = connections.selectedAppId
    ? deconstructClientId(connections.selectedAppId).app
    : undefined;
  return selectedAppId;
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
  selectedApp = selectedApp ?? getSelectedAppName(store);
  if (!selectedApp) {
    return;
  }
  const {connections} = store.getState();
  const clients = getClientsByAppName(connections.clients, selectedApp);
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
  const clients = getAllClients(store.getState().connections);
  if (enable) {
    const selectedApp = getSelectedAppName(store);
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
  clientsWithEnabledPlugin.forEach((client) => {
    stopPlugin(client, plugin.id);
  });
  clientsWithEnabledPlugin.forEach((client) => {
    startPlugin(client, plugin, true);
  });
  if (
    !store
      .getState()
      .plugins.disabledPlugins.find(
        (disabledPlugin) => disabledPlugin.id === plugin.id,
      ) &&
    !store
      .getState()
      .plugins.gatekeepedPlugins.find((gkPlugin) => gkPlugin.id === plugin.id)
  ) {
    store.dispatch(pluginLoaded(plugin));
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
  devicesWithEnabledPlugin.forEach((d) => {
    d.loadDevicePlugin(plugin);
  });
  if (
    !store
      .getState()
      .plugins.disabledPlugins.find(
        (disabledPlugin) => disabledPlugin.id === plugin.id,
      ) &&
    !store
      .getState()
      .plugins.gatekeepedPlugins.find((gkPlugin) => gkPlugin.id === plugin.id)
  ) {
    store.dispatch(pluginLoaded(plugin));
  }
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
