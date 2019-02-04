/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {Store} from '../reducers';
import type {DeviceExport} from '../devices/BaseDevice';
import type {State as PluginStates} from '../reducers/pluginStates';
import type {PluginNotification} from '../reducers/notifications.js';
import type {ClientExport} from '../Client.js';
import type {State as PluginStatesState} from '../reducers/pluginStates';
import type {State} from '../reducers/index';
import {FlipperDevicePlugin} from '../plugin.js';
import {default as BaseDevice} from '../devices/BaseDevice';

import fs from 'fs';
import os from 'os';
import path from 'path';

const exportFilePath = path.join(
  os.homedir(),
  '.flipper',
  'FlipperExport.json',
);

export type ExportType = {|
  fileVersion: '1.0.0',
  clients: Array<ClientExport>,
  device: ?DeviceExport,
  store: {
    pluginStates: PluginStates,
    activeNotifications: Array<PluginNotification>,
  },
|};

export function processClients(
  clients: Array<ClientExport>,
  serial: string,
): Array<ClientExport> {
  return clients.filter(client => client.query.device_id === serial);
}

export function processPluginStates(
  clients: Array<ClientExport>,
  serial: string,
  allPluginStates: PluginStatesState,
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
): PluginStatesState {
  let pluginStates = {};
  for (let key in allPluginStates) {
    let keyArray = key.split('#');
    const pluginName = keyArray.pop();
    const filteredClients = clients.filter(client => {
      // Remove the last entry related to plugin
      return client.id.includes(keyArray.join('#'));
    });
    if (
      filteredClients.length > 0 ||
      (devicePlugins.has(pluginName) && serial === keyArray[0])
    ) {
      // There need not be any client for device Plugins
      pluginStates = {...pluginStates, [key]: allPluginStates[key]};
    }
  }
  return pluginStates;
}

export function processNotificationStates(
  clients: Array<ClientExport>,
  serial: string,
  allActiveNotifications: Array<PluginNotification>,
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
): Array<PluginNotification> {
  let activeNotifications = allActiveNotifications.filter(notif => {
    const filteredClients = clients.filter(
      client => (notif.client ? client.id.includes(notif.client) : false),
    );
    return (
      filteredClients.length > 0 ||
      (devicePlugins.has(notif.pluginId) && serial === notif.client)
    ); // There need not be any client for device Plugins
  });
  return activeNotifications;
}

export const processStore = (
  activeNotifications: Array<PluginNotification>,
  device: ?BaseDevice,
  pluginStates: PluginStatesState,
  clients: Array<ClientExport>,
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
): ?ExportType => {
  if (device) {
    const {serial} = device;
    const processedClients = processClients(clients, serial);
    let processedPluginStates = processPluginStates(
      processedClients,
      serial,
      pluginStates,
      devicePlugins,
    );
    const processedActiveNotifications = processNotificationStates(
      processedClients,
      serial,
      activeNotifications,
      devicePlugins,
    );
    return {
      fileVersion: '1.0.0',
      clients: processedClients,
      device: device.toJSON(),
      store: {
        pluginStates: processedPluginStates,
        activeNotifications: processedActiveNotifications,
      },
    };
  }
  return null;
};

export function serializeStore(state: State): ?ExportType {
  const {activeNotifications} = state.notifications;
  const {selectedDevice, clients} = state.connections;
  const {pluginStates} = state;
  const {devicePlugins} = state.plugins;
  // TODO: T39612653 Make Client mockable. Currently rsocket logic is tightly coupled.
  // Not passing the entire state as currently Client is not mockable.
  return processStore(
    activeNotifications,
    selectedDevice,
    pluginStates,
    clients.map(client => client.toJSON()),
    devicePlugins,
  );
}

export const exportStoreToFile = (store: Store): Promise<void> => {
  const json = serializeStore(store.getState());
  if (json) {
    return new Promise((resolve, reject) => {
      fs.writeFile(exportFilePath, JSON.stringify(json), err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }
  console.error('Make sure a device is connected');
  return new Promise.reject(new Error('No device is selected'));
};
