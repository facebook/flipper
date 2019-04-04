/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {getInstance as getLogger} from '../fb-stubs/Logger';
import type {Store, MiddlewareAPI} from '../reducers';
import type {DeviceExport} from '../devices/BaseDevice';
import type {State as PluginStates} from '../reducers/pluginStates';
import type {PluginNotification} from '../reducers/notifications.js';
import type {ClientExport} from '../Client.js';
import type {State as PluginStatesState} from '../reducers/pluginStates';
import {pluginKey} from '../reducers/pluginStates';
import {FlipperDevicePlugin, FlipperPlugin, callClient} from '../plugin.js';
import {default as BaseDevice} from '../devices/BaseDevice';
import {default as ArchivedDevice} from '../devices/ArchivedDevice';
import {default as Client} from '../Client';
import {getInstance} from '../fb-stubs/Logger.js';
import fs from 'fs';
import uuid from 'uuid';
import {remote} from 'electron';
import {serialize, deserialize} from './serialization';
import {readCurrentRevision} from './packageMetadata.js';
import {tryCatchReportPlatformFailures} from './metrics';
import {promisify} from 'util';
import promiseTimeout from './promiseTimeout';
export const IMPORT_FLIPPER_TRACE_EVENT = 'import-flipper-trace';
export const EXPORT_FLIPPER_TRACE_EVENT = 'export-flipper-trace';

export type ExportType = {|
  fileVersion: string,
  flipperReleaseRevision: ?string,
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
    const filteredClients = clients.filter(client =>
      notif.client ? client.id.includes(notif.client) : false,
    );
    return (
      filteredClients.length > 0 ||
      (devicePlugins.has(notif.pluginId) && serial === notif.client)
    ); // There need not be any client for device Plugins
  });
  return activeNotifications;
}

const addSaltToDeviceSerial = async (
  salt: string,
  device: BaseDevice,
  clients: Array<ClientExport>,
  pluginStates: PluginStatesState,
  pluginNotification: Array<PluginNotification>,
): Promise<ExportType> => {
  const {serial} = device;
  const newSerial = salt + '-' + serial;
  const newDevice = new ArchivedDevice(
    newSerial,
    device.deviceType,
    device.title,
    device.os,
    device.getLogs(),
  );
  const updatedClients = clients.map((client: ClientExport) => {
    return {
      ...client,
      id: client.id.replace(serial, newSerial),
      query: {...client.query, device_id: newSerial},
    };
  });

  const updatedPluginStates: PluginStatesState = {};
  for (let key in pluginStates) {
    if (!key.includes(serial)) {
      throw new Error(
        `Error while exporting, plugin state (${key}) does not have ${serial} in its key`,
      );
    }
    const pluginData = pluginStates[key];
    key = key.replace(serial, newSerial);
    updatedPluginStates[key] = pluginData;
  }

  const updatedPluginNotifications = pluginNotification.map(notif => {
    if (!notif.client || !notif.client.includes(serial)) {
      throw new Error(
        `Error while exporting, plugin state (${
          notif.pluginId
        }) does not have ${serial} in it`,
      );
    }
    return {...notif, client: notif.client.replace(serial, newSerial)};
  });
  const revision: ?string = await readCurrentRevision();
  return {
    fileVersion: remote.app.getVersion(),
    flipperReleaseRevision: revision,
    clients: updatedClients,
    device: newDevice.toJSON(),
    store: {
      pluginStates: updatedPluginStates,
      activeNotifications: updatedPluginNotifications,
    },
  };
};

export const processStore = async (
  activeNotifications: Array<PluginNotification>,
  device: ?BaseDevice,
  pluginStates: PluginStatesState,
  clients: Array<ClientExport>,
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
  salt: string,
): Promise<?ExportType> => {
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
    // Adding salt to the device id, so that the device_id in the device list is unique.
    const exportFlipperData = await addSaltToDeviceSerial(
      salt,
      device,
      processedClients,
      processedPluginStates,
      processedActiveNotifications,
    );
    return exportFlipperData;
  }
  return null;
};

export async function getStoreExport(
  store: MiddlewareAPI,
): Promise<{exportData: ?ExportType, errorArray: Array<Error>}> {
  const state = store.getState();
  const {clients} = state.connections;
  const {pluginStates} = state;
  const {plugins} = state;
  const newPluginState = {...pluginStates};
  // TODO: T39612653 Make Client mockable. Currently rsocket logic is tightly coupled.
  // Not passing the entire state as currently Client is not mockable.

  const pluginsMap: Map<
    string,
    Class<FlipperDevicePlugin<> | FlipperPlugin<>>,
  > = new Map([]);
  plugins.clientPlugins.forEach((val, key) => {
    pluginsMap.set(key, val);
  });
  plugins.devicePlugins.forEach((val, key) => {
    pluginsMap.set(key, val);
  });
  const errorArray: Array<Error> = [];
  for (let client of clients) {
    for (let plugin of client.plugins) {
      const pluginClass: ?Class<
        FlipperDevicePlugin<> | FlipperPlugin<>,
      > = plugin ? pluginsMap.get(plugin) : null;
      const exportState = pluginClass ? pluginClass.exportPersistedState : null;
      if (exportState) {
        const key = pluginKey(client.id, plugin);
        try {
          const data = await promiseTimeout(
            120000, // Timeout in 2 mins
            exportState(callClient(client, plugin), newPluginState[key], store),
            `Timed out while collecting data for ${plugin}`,
          );
          newPluginState[key] = data;
        } catch (e) {
          errorArray.push(e);
          continue;
        }
      }
    }
  }

  const {activeNotifications} = store.getState().notifications;
  const {selectedDevice} = store.getState().connections;
  const {devicePlugins} = store.getState().plugins;

  const exportData = await processStore(
    activeNotifications,
    selectedDevice,
    newPluginState,
    clients.map(client => client.toJSON()),
    devicePlugins,
    uuid.v4(),
  );
  return {exportData, errorArray};
}

export function exportStore(
  store: MiddlewareAPI,
): Promise<{serializedString: string, errorArray: Array<Error>}> {
  getLogger().track('usage', EXPORT_FLIPPER_TRACE_EVENT);
  return new Promise(async (resolve, reject) => {
    const {exportData, errorArray} = await getStoreExport(store);
    if (!exportData) {
      console.error('Make sure a device is connected');
      reject('No device is selected');
    }
    const serializedString = serialize(exportData);
    if (serializedString.length <= 0) {
      reject('Serialize function returned empty string');
    }
    resolve({serializedString, errorArray});
  });
}

export const exportStoreToFile = (
  exportFilePath: string,
  store: Store,
): Promise<{errorArray: Array<Error>}> => {
  return exportStore(store).then(({serializedString, errorArray}) => {
    return promisify(fs.writeFile)(exportFilePath, serializedString).then(
      () => {
        return {errorArray};
      },
    );
  });
};

export function importDataToStore(data: string, store: Store) {
  getLogger().track('usage', IMPORT_FLIPPER_TRACE_EVENT);
  const json = deserialize(data);
  const {device, clients} = json;
  const {serial, deviceType, title, os, logs} = device;
  const archivedDevice = new ArchivedDevice(
    serial,
    deviceType,
    title,
    os,
    logs ? logs : [],
  );
  const devices = store.getState().connections.devices;
  const matchedDevices = devices.filter(
    availableDevice => availableDevice.serial === serial,
  );
  if (matchedDevices.length > 0) {
    store.dispatch({
      type: 'SELECT_DEVICE',
      payload: matchedDevices[0],
    });
    return;
  }
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: archivedDevice,
  });
  store.dispatch({
    type: 'SELECT_DEVICE',
    payload: archivedDevice,
  });

  const {pluginStates} = json.store;
  const keys = Object.keys(pluginStates);
  clients.forEach(client => {
    const clientPlugins = keys
      .filter(key => {
        const arr = key.split('#');
        arr.pop();
        const clientPlugin = arr.join('#');
        return client.id === clientPlugin;
      })
      .map(client => client.split('#').pop());
    store.dispatch({
      type: 'NEW_CLIENT',
      payload: new Client(
        client.id,
        client.query,
        null,
        getInstance(),
        store,
        clientPlugins,
      ),
    });
  });
  keys.forEach(key => {
    store.dispatch({
      type: 'SET_PLUGIN_STATE',
      payload: {
        pluginKey: key,
        state: pluginStates[key],
      },
    });
  });
}

export const importFileToStore = (file: string, store: Store) => {
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    importDataToStore(data, store);
  });
};

export function showOpenDialog(store: Store) {
  remote.dialog.showOpenDialog(
    {
      properties: ['openFile'],
    },
    (files: Array<string>) => {
      if (files !== undefined && files.length > 0) {
        tryCatchReportPlatformFailures(() => {
          importFileToStore(files[0], store);
        }, `${IMPORT_FLIPPER_TRACE_EVENT}:UI`);
      }
    },
  );
}
