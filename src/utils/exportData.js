/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const exportFilePath = path.join(
  os.homedir(),
  '.flipper',
  'FlipperExport.json',
);

export const exportStoreToFile = (data: Store): Promise<void> => {
  const state = data.getState();
  const json = {
    fileVersion: '1.0.0',
    device: {},
    clients: [],
    store: {
      pluginStates: {},
      activeNotifications: [],
    },
  };

  const device = state.connections.selectedDevice;
  if (device) {
    const {serial} = device;
    json.device = device.toJSON();
    const clients = state.connections.clients
      .filter(client => {
        return client.query.device_id === serial;
      })
      .map(client => {
        return client.toJSON();
      });

    json.clients = clients;

    const allPluginStates = state.pluginStates;
    let pluginStates = {};
    for (let key in allPluginStates) {
      const filteredClients = clients.filter(client => {
        let keyArray = key.split('#');
        keyArray.pop(); // Remove the last entry related to plugin
        return client.id.includes(keyArray.join('#'));
      });
      if (filteredClients.length > 0) {
        pluginStates = {...pluginStates, [key]: allPluginStates[key]};
        json.store.pluginStates = pluginStates;
      }
    }

    const allActiveNotifications = state.notifications.activeNotifications;
    let activeNotifications = allActiveNotifications.filter(notif => {
      const filteredClients = clients.filter(client =>
        client.id.includes(notif.client),
      );
      return filteredClients.length > 0;
    });
    json.store.activeNotifications = activeNotifications;
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
