/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {State} from '../reducers';
import {
  computePluginLists,
  computeExportablePlugins,
  computeActivePluginList,
} from '../utils/pluginUtils';
import createSelector from './createSelector';
import {canBeDefaultDevice, getClientsByDevice} from '../reducers/connections';

const getSelectedPluginId = (state: State) => state.connections.selectedPlugin;
const getSelectedDevice = (state: State) => state.connections.selectedDevice;
const getDevices = (state: State) => state.connections.devices;
const getClients = (state: State) => state.connections.clients;
const getPluginDownloads = (state: State) => state.pluginDownloads;

// N.B. no useSelector, It can't memoise on maps :-/
export const getActiveClient = (state: State) =>
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  state.connections.clients.get(state.connections.selectedAppId!) ?? null;

export const getSelectableDevices = createSelector(
  getDevices,
  getClients,
  (devices, clients) => {
    return devices.filter(
      (device) =>
        // hide non default devices, unless they have a connected client or plugins
        canBeDefaultDevice(device) ||
        device.hasDevicePlugins ||
        getClientsByDevice(device, clients).length > 0,
    );
  },
);

export const hasSelectableDevices = createSelector(
  getSelectableDevices,
  (selectableDevices) => selectableDevices.length > 0,
);

export const getActiveDevice = createSelector(
  getSelectedDevice,
  getActiveClient,
  (selectedDevice, client) => {
    // if there is an active app, use device owning the app
    if (client) {
      // TODO: Will be fixed later in the stack
      return client.device as any;
    }
    return selectedDevice;
  },
);

export const getPluginLists = createSelector(
  ({
    connections: {
      enabledDevicePlugins,
      enabledPlugins,
      selectedAppPluginListRevision, // used only to invalidate cache
    },
  }: State) => ({
    enabledDevicePlugins,
    enabledPlugins,
    selectedAppPluginListRevision,
  }),
  ({
    plugins: {
      clientPlugins,
      devicePlugins,
      marketplacePlugins,
      loadedPlugins,
      disabledPlugins,
      gatekeepedPlugins,
      failedPlugins,
    },
  }: State) => ({
    clientPlugins,
    devicePlugins,
    marketplacePlugins,
    loadedPlugins,
    disabledPlugins,
    gatekeepedPlugins,
    failedPlugins,
  }),
  getActiveDevice,
  getActiveClient,
  computePluginLists,
);

export const getExportablePlugins = createSelector(
  ({plugins, connections, pluginMessageQueue}: State) => ({
    plugins,
    connections,
    pluginMessageQueue,
  }),
  getActiveDevice,
  getActiveClient,
  getPluginLists,
  computeExportablePlugins,
);
export const getActivePluginList = createSelector(
  getPluginLists,
  computeActivePluginList,
);

export const getActivePlugin = createSelector(
  getSelectedPluginId,
  getActivePluginList,
  (pluginId, pluginList) => {
    if (!pluginId) {
      return null;
    }
    return pluginList[pluginId] ?? null;
  },
);

export const getPluginDownloadStatusMap = createSelector(
  getPluginDownloads,
  (downloads) => {
    const downloadMap = new Map(
      Object.values(downloads).map((x) => [x.plugin.id, x]),
    );
    return downloadMap;
  },
);
