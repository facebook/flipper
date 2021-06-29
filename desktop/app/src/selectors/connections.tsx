/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  PluginDetails,
  DownloadablePluginDetails,
  BundledPluginDetails,
} from 'flipper-plugin-lib';
import MetroDevice from '../devices/MetroDevice';
import {
  DevicePluginDefinition,
  ClientPluginDefinition,
  PluginDefinition,
} from '../plugin';
import {State} from '../reducers';
import {
  computePluginLists,
  computeExportablePlugins,
} from '../utils/pluginUtils';
import createSelector from './createSelector';

export type PluginLists = {
  devicePlugins: DevicePluginDefinition[];
  metroPlugins: DevicePluginDefinition[];
  enabledPlugins: ClientPluginDefinition[];
  disabledPlugins: PluginDefinition[];
  unavailablePlugins: [plugin: PluginDetails, reason: string][];
  downloadablePlugins: (DownloadablePluginDetails | BundledPluginDetails)[];
};

const getSelectedApp = (state: State) =>
  state.connections.selectedApp || state.connections.userPreferredApp;
const getSelectedDevice = (state: State) => state.connections.selectedDevice;
const getUserPreferredDevice = (state: State) =>
  state.connections.userPreferredDevice;
const getClients = (state: State) => state.connections.clients;
const getDevices = (state: State) => state.connections.devices;

export const getActiveClient = createSelector(
  getSelectedApp,
  getClients,
  (selectedApp, clients) => {
    return clients.find((c) => c.id === selectedApp) || null;
  },
);

export const getMetroDevice = createSelector(getDevices, (devices) => {
  return (
    (devices.find(
      (device) => device.os === 'Metro' && !device.isArchived,
    ) as MetroDevice) ?? null
  );
});

export const getActiveDevice = createSelector(
  getSelectedDevice,
  getUserPreferredDevice,
  getDevices,
  getActiveClient,
  getMetroDevice,
  (selectedDevice, userPreferredDevice, devices, client, metroDevice) => {
    // if not Metro device, use the selected device as metro device
    if (selectedDevice !== metroDevice) {
      return selectedDevice;
    }
    // if there is an active app, use device owning the app
    if (client) {
      return client.deviceSync;
    }
    // if no active app, use the preferred device
    if (userPreferredDevice) {
      return (
        devices.find((device) => device.title === userPreferredDevice) ??
        selectedDevice
      );
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
      bundledPlugins,
      marketplacePlugins,
      loadedPlugins,
      disabledPlugins,
      gatekeepedPlugins,
      failedPlugins,
    },
  }: State) => ({
    clientPlugins,
    devicePlugins,
    bundledPlugins,
    marketplacePlugins,
    loadedPlugins,
    disabledPlugins,
    gatekeepedPlugins,
    failedPlugins,
  }),
  getActiveDevice,
  getMetroDevice,
  getActiveClient,
  computePluginLists,
);

export const getExportablePlugins = createSelector(
  ({plugins, connections, pluginStates, pluginMessageQueue}: State) => ({
    plugins,
    connections,
    pluginStates,
    pluginMessageQueue,
  }),
  getActiveDevice,
  getActiveClient,
  getPluginLists,
  computeExportablePlugins,
);
