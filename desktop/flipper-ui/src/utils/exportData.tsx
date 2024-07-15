/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {
  getLogger,
  DeviceDebugFile,
  DeviceDebugCommand,
  timeout,
  getStringFromErrorLike,
} from 'flipper-common';
import {Store, MiddlewareAPI} from '../reducers';
import {selectedPlugins, State as PluginsState} from '../reducers/plugins';
import {PluginNotification} from '../reducers/notifications';
import Client, {ClientExport} from '../Client';
import {getAppVersion} from './info';
import {pluginKey} from '../utils/pluginKey';
import {DevicePluginMap, ClientPluginMap} from '../plugin';
import {v4 as uuidv4} from 'uuid';
import {TestIdler} from './Idler';
import {processMessageQueue} from './messageQueue';
import {getPluginTitle} from './pluginUtils';
import {Dialog, getFlipperLib, Idler} from 'flipper-plugin';
import {ClientQuery} from 'flipper-common';
import ShareSheetExportUrl from '../chrome/ShareSheetExportUrl';
import ShareSheetExportFile from '../chrome/ShareSheetExportFile';
import ExportDataPluginSheet from '../chrome/ExportDataPluginSheet';
import {exportLogs} from '../chrome/ConsoleLogs';
import JSZip from 'jszip';
import {safeFilename} from './safeFilename';
import {getExportablePlugins} from '../selectors/connections';
import {notification} from 'antd';
import openSupportRequestForm from '../fb-stubs/openSupportRequestForm';
import {getStore} from '../store';
import BaseDevice, {DeviceExport} from '../devices/BaseDevice';
import ArchivedDevice from '../devices/ArchivedDevice';
import {importFile} from './importFile';
import {exportFileBinary} from './exportFile';
import {getFlipperServer, getFlipperServerConfig} from '../flipperServer';

export const IMPORT_FLIPPER_TRACE_EVENT = 'import-flipper-trace';
export const EXPORT_FLIPPER_TRACE_EVENT = 'export-flipper-trace';
export const EXPORT_FLIPPER_TRACE_TIME_SERIALIZATION_EVENT = `${EXPORT_FLIPPER_TRACE_EVENT}:serialization`;

// maps clientId -> pluginId -> persistence key -> state
export type SandyPluginStates = Record<
  string,
  Record<string, Record<string, any>>
>;

export type PluginStatesExportState = {
  [pluginKey: string]: string;
};

export type ExportType = {
  fileVersion: string;
  flipperReleaseRevision: string | undefined;
  clients: Array<ClientExport>;
  device: DeviceExport | null;
  deviceScreenshot: string | null;
  store: {
    activeNotifications: Array<PluginNotification>;
  };
  // The GraphQL plugin relies on this format for generating
  // Flipper traces from employee dogfooding. See D28209561.
  pluginStates2: SandyPluginStates;
};

type ProcessNotificationStatesOptions = {
  clients: Array<ClientExport>;
  serial: string;
  allActiveNotifications: Array<PluginNotification>;
  devicePlugins: DevicePluginMap;
  statusUpdate?: (msg: string) => void;
};

type PluginsToProcess = {
  pluginKey: string;
  pluginId: string;
  pluginName: string;
  client: Client;
}[];

type AddSaltToDeviceSerialOptions = {
  salt: string;
  device: BaseDevice;
  deviceScreenshot: string | null;
  clients: Array<ClientExport>;
  pluginStates2: SandyPluginStates;
  devicePluginStates: Record<string, any>;
  pluginNotification: Array<PluginNotification>;
  selectedPlugins: Array<string>;
  statusUpdate: (msg: string) => void;
  idler: Idler;
};

export function displayFetchMetadataErrors(
  fetchMetaDataErrors: {
    [plugin: string]: Error;
  } | null,
): {title: string; errorArray: Array<Error>} {
  const errors = fetchMetaDataErrors ? Object.values(fetchMetaDataErrors) : [];
  const pluginsWithFetchMetadataErrors = fetchMetaDataErrors
    ? Object.keys(fetchMetaDataErrors)
    : [];
  const title =
    fetchMetaDataErrors && pluginsWithFetchMetadataErrors.length > 0
      ? `Export was successfull, but plugin${
          pluginsWithFetchMetadataErrors.length > 1 ? 's' : ''
        } ${pluginsWithFetchMetadataErrors.join(
          ', ',
        )} might be ignored because of the following errors.`
      : '';
  return {title, errorArray: errors};
}

export function processClients(
  clients: Array<ClientExport>,
  serial: string,
  statusUpdate?: (msg: string) => void,
): Array<ClientExport> {
  statusUpdate &&
    statusUpdate(`Filtering Clients for the device id ${serial}...`);
  const filteredClients = clients.filter(
    (client) => client.query.device_id === serial,
  );
  return filteredClients;
}

export function processNotificationStates(
  options: ProcessNotificationStatesOptions,
): Array<PluginNotification> {
  const {clients, serial, allActiveNotifications, devicePlugins, statusUpdate} =
    options;
  statusUpdate &&
    statusUpdate('Filtering the notifications for the filtered Clients...');
  const activeNotifications = allActiveNotifications.filter((notif) => {
    const filteredClients = clients.filter((client) =>
      notif.client ? client.id.includes(notif.client) : false,
    );
    return (
      filteredClients.length > 0 ||
      (devicePlugins.has(notif.pluginId) && serial === notif.client)
    ); // There need not be any client for device Plugins
  });
  return activeNotifications;
}

async function exportSandyPluginStates(
  pluginsToProcess: PluginsToProcess,
  idler: Idler,
  statusUpdate: (msg: string) => void,
): Promise<SandyPluginStates> {
  const res: SandyPluginStates = {};
  for (const key in pluginsToProcess) {
    const {pluginId, client} = pluginsToProcess[key];
    if (client.sandyPluginStates.has(pluginId)) {
      if (!res[client.id]) {
        res[client.id] = {};
      }
      try {
        // TODO: Fix this the next time the file is edited.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        res[client.id][pluginId] = await client.sandyPluginStates
          .get(pluginId)!
          .exportState(idler, statusUpdate);
      } catch (error) {
        console.error(`Error while serializing plugin ${pluginId}`, error);
        throw new Error(`Failed to serialize plugin ${pluginId}: ${error}`);
      }
    }
  }
  return res;
}

function replaceSerialsInKeys<T extends Record<string, any>>(
  collection: T,
  baseSerial: string,
  newSerial: string,
): T {
  const result: Record<string, any> = {};
  for (const key in collection) {
    if (!key.includes(baseSerial)) {
      continue;
    }
    result[key.replace(baseSerial, newSerial)] = collection[key];
  }
  return result as T;
}

async function addSaltToDeviceSerial({
  salt,
  device,
  deviceScreenshot,
  clients,
  pluginNotification,
  statusUpdate,
  pluginStates2,
  devicePluginStates,
}: AddSaltToDeviceSerialOptions): Promise<ExportType> {
  const {serial} = device;
  const newSerial = `${salt}-${serial}`;
  const newDevice = new ArchivedDevice({
    serial: newSerial,
    deviceType: device.deviceType,
    title: device.title,
    os: device.os,
    screenshotHandle: deviceScreenshot,
  });
  statusUpdate &&
    statusUpdate('Adding salt to the selected device id in the client data...');
  const updatedClients = clients.map((client: ClientExport) => {
    return {
      ...client,
      id: client.id.replace(serial, newSerial),
      query: {...client.query, device_id: newSerial},
    };
  });

  statusUpdate &&
    statusUpdate(
      'Adding salt to the selected device id in the plugin states...',
    );
  const updatedPluginStates2 = replaceSerialsInKeys(
    pluginStates2,
    serial,
    newSerial,
  );

  statusUpdate &&
    statusUpdate(
      'Adding salt to the selected device id in the notification data...',
    );
  const updatedPluginNotifications = pluginNotification.map((notif) => {
    if (!notif.client || !notif.client.includes(serial)) {
      throw new Error(
        `Error while exporting, plugin state (${notif.pluginId}) does not have ${serial} in it`,
      );
    }
    return {...notif, client: notif.client.replace(serial, newSerial)};
  });
  const revision: string | undefined =
    getFlipperServerConfig().environmentInfo.flipperReleaseRevision;
  return {
    fileVersion: getAppVersion() || 'unknown',
    flipperReleaseRevision: revision,
    clients: updatedClients,
    device: {...newDevice.toJSON(), pluginStates: devicePluginStates},
    deviceScreenshot,
    store: {
      activeNotifications: updatedPluginNotifications,
    },
    pluginStates2: updatedPluginStates2,
  };
}

type ProcessStoreOptions = {
  activeNotifications: Array<PluginNotification>;
  device: BaseDevice | null;
  pluginStates2: SandyPluginStates;
  clients: Array<ClientExport>;
  devicePlugins: DevicePluginMap;
  clientPlugins: ClientPluginMap;
  salt: string;
  selectedPlugins: Array<string>;
  statusUpdate?: (msg: string) => void;
};

export async function processStore(
  {
    activeNotifications,
    device,
    pluginStates2,
    clients,
    devicePlugins,
    salt,
    selectedPlugins,
    statusUpdate,
  }: ProcessStoreOptions,
  idler: Idler = new TestIdler(true),
): Promise<ExportType> {
  if (device) {
    const {serial} = device;
    if (!statusUpdate) {
      statusUpdate = () => {};
    }
    statusUpdate('Capturing screenshot...');
    const processedClients = processClients(clients, serial, statusUpdate);

    const processedActiveNotifications = processNotificationStates({
      clients: processedClients,
      serial,
      allActiveNotifications: activeNotifications,
      devicePlugins,
      statusUpdate,
    });

    const devicePluginStates = await device.exportState(
      idler,
      statusUpdate,
      selectedPlugins,
    );

    // Adding salt to the device id, so that the device_id in the device list is unique.
    const exportFlipperData = await addSaltToDeviceSerial({
      salt,
      device,
      // This is no longer being used and is only kept for backwards compatibility.
      deviceScreenshot: null,
      clients: processedClients,
      pluginNotification: processedActiveNotifications,
      statusUpdate,
      selectedPlugins,
      pluginStates2,
      devicePluginStates,
      idler,
    });

    return exportFlipperData;
  }
  throw new Error('Selected device is null, please select a device');
}

async function processQueues(
  store: MiddlewareAPI,
  pluginsToProcess: PluginsToProcess,
  statusUpdate?: (msg: string) => void,
  idler?: Idler,
) {
  for (const {pluginName, pluginId, pluginKey, client} of pluginsToProcess) {
    client.flushMessageBuffer();
    const processQueueMarker = `${EXPORT_FLIPPER_TRACE_EVENT}:process-queue-per-plugin`;
    performance.mark(processQueueMarker);
    const plugin = client.sandyPluginStates.get(pluginId);
    if (!plugin) continue;
    await processMessageQueue(
      plugin,
      pluginKey,
      store,
      ({current, total}) => {
        statusUpdate?.(
          `Processing event ${current} / ${total} (${Math.round(
            (current / total) * 100,
          )}%) for plugin ${pluginName}`,
        );
      },
      idler,
    );

    getLogger().trackTimeSince(processQueueMarker, processQueueMarker, {
      pluginId,
    });
  }
}

export function determinePluginsToProcess(
  clients: Array<Client>,
  selectedDevice: null | BaseDevice,
  plugins: PluginsState,
): PluginsToProcess {
  const pluginsToProcess: PluginsToProcess = [];
  const selectedPlugins = plugins.selectedPlugins;

  for (const client of clients) {
    if (!selectedDevice || client.query.device_id !== selectedDevice.serial) {
      continue;
    }
    const selectedFilteredPlugins = client
      ? selectedPlugins.length > 0
        ? Array.from(client.plugins).filter((plugin) =>
            selectedPlugins.includes(plugin),
          )
        : client.plugins
      : [];
    for (const plugin of selectedFilteredPlugins) {
      if (!client.plugins.has(plugin)) {
        // Ignore clients which doesn't support the selected plugins.
        continue;
      }
      const pluginClass =
        plugins.clientPlugins.get(plugin) || plugins.devicePlugins.get(plugin);
      if (pluginClass) {
        const key = pluginKey(client.id, plugin);
        pluginsToProcess.push({
          pluginKey: key,
          client,
          pluginId: plugin,
          pluginName: getPluginTitle(pluginClass),
        });
      }
    }
  }
  return pluginsToProcess;
}

async function getStoreExport(
  store: MiddlewareAPI,
  statusUpdate: (msg: string) => void = () => {},
  idler: Idler,
): Promise<{
  exportData: ExportType;
  fetchMetaDataErrors: {[plugin: string]: Error} | null;
}> {
  let state = store.getState();
  const {clients, selectedAppId, selectedDevice} = state.connections;
  const pluginsToProcess = determinePluginsToProcess(
    Array.from(clients.values()),
    selectedDevice,
    state.plugins,
  );

  statusUpdate?.('Preparing to process data queues for plugins...');
  await processQueues(store, pluginsToProcess, statusUpdate, idler);
  state = store.getState();

  statusUpdate && statusUpdate('Preparing to fetch metadata from client...');
  const fetchMetaDataMarker = `${EXPORT_FLIPPER_TRACE_EVENT}:fetch-meta-data`;
  performance.mark(fetchMetaDataMarker);

  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const client = clients.get(selectedAppId!);

  const pluginStates2 = pluginsToProcess
    ? await exportSandyPluginStates(pluginsToProcess, idler, statusUpdate)
    : {};

  getLogger().trackTimeSince(fetchMetaDataMarker, fetchMetaDataMarker, {
    plugins: state.plugins.selectedPlugins,
  });

  const {activeNotifications} = state.notifications;
  const {devicePlugins, clientPlugins} = state.plugins;
  const exportData = await processStore(
    {
      activeNotifications,
      device: selectedDevice,
      pluginStates2,
      clients: client ? [client.toJSON()] : [],
      devicePlugins,
      clientPlugins,
      salt: uuidv4(),
      selectedPlugins: state.plugins.selectedPlugins,
      statusUpdate,
    },
    idler,
  );
  return {exportData, fetchMetaDataErrors: null};
}

export async function exportStore(
  store: MiddlewareAPI,
  includeSupportDetails?: boolean,
  idler: Idler = new TestIdler(true),
  statusUpdate: (msg: string) => void = () => {},
): Promise<{
  serializedString: string;
  fetchMetaDataErrors: {
    [plugin: string]: Error;
  } | null;
  exportStoreData: ExportType;
}> {
  getLogger().track('usage', EXPORT_FLIPPER_TRACE_EVENT);
  performance.mark(EXPORT_FLIPPER_TRACE_TIME_SERIALIZATION_EVENT);
  statusUpdate && statusUpdate('Preparing to export Flipper data...');
  const state = store.getState();
  const {exportData, fetchMetaDataErrors} = await getStoreExport(
    store,
    statusUpdate,
    idler,
  );

  statusUpdate && statusUpdate('Serializing Flipper data...');
  const serializedString = JSON.stringify(exportData);
  if (serializedString.length <= 0) {
    throw new Error('Serialize function returned empty string');
  }
  getLogger().trackTimeSince(
    EXPORT_FLIPPER_TRACE_TIME_SERIALIZATION_EVENT,
    EXPORT_FLIPPER_TRACE_TIME_SERIALIZATION_EVENT,
    {
      plugins: state.plugins.selectedPlugins,
    },
  );
  return {serializedString, fetchMetaDataErrors, exportStoreData: exportData};
}

export const exportStoreToFile = (
  exportFilePath: string,
  store: MiddlewareAPI,
  includeSupportDetails: boolean,
  idler?: Idler,
  statusUpdate?: (msg: string) => void,
): Promise<{
  fetchMetaDataErrors: {
    [plugin: string]: Error;
  } | null;
}> => {
  return exportStore(store, includeSupportDetails, idler, statusUpdate).then(
    async ({serializedString, fetchMetaDataErrors}) => {
      await getFlipperLib().remoteServerContext.fs.writeFile(
        exportFilePath,
        serializedString,
      );
      return {fetchMetaDataErrors};
    },
  );
};

export async function importDataToStore(
  source: string,
  data: string,
  store: Store = getStore(),
) {
  getLogger().track('usage', IMPORT_FLIPPER_TRACE_EVENT);
  const json: ExportType = JSON.parse(data);
  const {device, clients, deviceScreenshot} = json;
  if (device == null) {
    return;
  }
  const {serial, deviceType, title, os} = device;

  const archivedDevice = new ArchivedDevice({
    serial,
    deviceType,
    title,
    os,
    screenshotHandle: deviceScreenshot,
    source,
  });
  archivedDevice.loadDevicePlugins(
    store.getState().plugins.devicePlugins,
    store.getState().connections.enabledDevicePlugins,
    device.pluginStates,
  );
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: archivedDevice,
  });
  store.dispatch({
    type: 'SELECT_DEVICE',
    payload: archivedDevice,
  });

  await Promise.all(
    clients.map(async (client: {id: string; query: ClientQuery}) => {
      const sandyPluginStates = json.pluginStates2[client.id] || {};
      const clientPlugins = new Set(Object.keys(sandyPluginStates));
      const clientInstance = await new Client(
        client.id,
        client.query,
        null,
        getLogger(),
        store,
        clientPlugins,
        archivedDevice,
        getFlipperServer(),
      ).initFromImport(sandyPluginStates);
      store.dispatch({
        type: 'NEW_CLIENT',
        payload: clientInstance,
      });
    }),
  );
}

export const importFileToStore = async (file: string, store: Store) => {
  try {
    const data = await getFlipperLib().remoteServerContext.fs.readFile(file);
    importDataToStore(file, data, store);
  } catch (err) {
    console.error(
      `[exportData] importFileToStore for file ${file} failed:`,
      err,
    );
    return;
  }
};

export async function startFileImport(store: Store) {
  const file = await importFile({
    extensions: ['flipper', 'json', 'txt'],
  });
  if (!file || typeof file.data !== 'string') {
    return;
  }
  importDataToStore(file.name, file.data as string, store);
}

async function startDeviceFlipperFolderExport() {
  return await getFlipperServer().exec(
    {timeout: 3 * 60 * 1000},
    'fetch-debug-data',
  );
}

export type ExportEverythingEverywhereAllAtOnceStatus =
  | ['logs']
  | ['files']
  | ['state']
  | ['archive']
  | ['upload']
  | ['support']
  | ['done']
  | ['error', string]
  | ['cancelled'];
export async function exportEverythingEverywhereAllAtOnce(
  store: MiddlewareAPI,
  onStatusUpdate?: (...args: ExportEverythingEverywhereAllAtOnceStatus) => void,
  openSupportRequest?: boolean,
) {
  const zip = new JSZip();

  // Step 1: Export Flipper logs
  onStatusUpdate?.('logs');
  const serializedLogs = exportLogs
    .map((item) => JSON.stringify(item))
    .join('\n');

  zip.file('flipper_logs.txt', serializedLogs);

  try {
    // Step 2: Export device logs
    onStatusUpdate?.('files');
    const flipperFolderContent = await startDeviceFlipperFolderExport();

    // TODO: Fix this the next time the file is edited.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const deviceFlipperFolder = zip.folder('device_flipper_folder')!;
    flipperFolderContent.forEach((deviceDebugItem) => {
      // TODO: Fix this the next time the file is edited.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const deviceAppFolder = deviceFlipperFolder.folder(
        safeFilename(`${deviceDebugItem.serial}__${deviceDebugItem.appId}`),
      )!;

      deviceDebugItem.data.forEach((appDebugItem) => {
        const appDebugItemIsFile = (
          item: DeviceDebugFile | DeviceDebugCommand,
        ): item is DeviceDebugFile => !!(appDebugItem as DeviceDebugFile).path;

        if (appDebugItemIsFile(appDebugItem)) {
          deviceAppFolder.file(
            safeFilename(appDebugItem.path),
            appDebugItem.data,
          );
        } else {
          deviceAppFolder.file(
            safeFilename(appDebugItem.command),
            appDebugItem.result,
          );
        }
      });
    });
  } catch (e) {
    console.error(
      'exportEverythingEverywhereAllAtOnce -> failed to export Flipper device debug data',
      e,
    );
  }

  try {
    // Step 3: Export Flipper State
    onStatusUpdate?.('state');
    const exportablePlugins = getExportablePlugins(store.getState());
    // TODO: no need to put this in the store,
    // need to be cleaned up later in combination with SupportForm
    store.dispatch(selectedPlugins(exportablePlugins.map(({id}) => id)));
    const {serializedString} = await timeout(2 * 60 * 1000, exportStore(store));

    zip.file('flipper_export', serializedString);
  } catch (e) {
    console.error(
      'exportEverythingEverywhereAllAtOnce -> failed to export Flipper state',
      e,
    );
  }

  onStatusUpdate?.('archive');
  const archiveData = await zip.generateAsync({type: 'uint8array'});

  const exportedFilePath = await exportFileBinary(archiveData, {
    defaultPath: 'flipper_EEAaO_export.zip',
  });

  if (openSupportRequest) {
    if (exportedFilePath) {
      onStatusUpdate?.('upload');

      let everythingEverywhereAllAtOnceExportDownloadURL: string | undefined;
      try {
        everythingEverywhereAllAtOnceExportDownloadURL =
          await getFlipperServer().exec(
            'intern-cloud-upload',
            exportedFilePath,
          );
      } catch (e) {
        console.error(
          'exportEverythingEverywhereAllAtOnce -> failed to upload export to intern',
          exportedFilePath,
        );
        notification.warn({
          message: 'Failed to upload debug data',
          description: `Flipper failed to upload debug export (${exportedFilePath}) automatically. Please, attach it to the support request manually in the comments after it is created.`,
          duration: null,
        });
      }

      onStatusUpdate?.('support');
      try {
        await openSupportRequestForm(store.getState(), {
          everythingEverywhereAllAtOnceExportDownloadURL,
        });
        onStatusUpdate?.('done');
      } catch (e) {
        console.error(
          'exportEverythingEverywhereAllAtOnce -> failed to create a support request',
          e,
        );
        onStatusUpdate?.('error', getStringFromErrorLike(e));
      }
    } else {
      notification.warn({
        message: 'Export cancelled',
        description: `Exporting Flipper debug data was cancelled. Flipper team will not be able to help you without this data. Please, restart the export.`,
        duration: null,
      });
      onStatusUpdate?.('cancelled');
    }
  } else {
    if (exportedFilePath) {
      onStatusUpdate?.('done');
    } else {
      onStatusUpdate?.('cancelled');
    }
  }
}

export async function startFileExport(dispatch: Store['dispatch']) {
  const plugins = await selectPlugins();
  if (plugins === false) {
    return;
  }
  // TODO: no need to put this in the store,
  // need to be cleaned up later in combination with SupportForm.
  dispatch(selectedPlugins(plugins));
  Dialog.showModal((onHide) => (
    <ShareSheetExportFile onHide={onHide} logger={getLogger()} />
  ));
}

export async function startLinkExport(dispatch: Store['dispatch']) {
  const plugins = await selectPlugins();
  if (plugins === false) {
    return; // cancelled
  }
  // TODO: no need to put this in the store,
  // need to be cleaned up later in combination with SupportForm
  dispatch(selectedPlugins(plugins));
  Dialog.showModal((onHide) => (
    <ShareSheetExportUrl onHide={onHide} logger={getLogger()} />
  ));
}

async function selectPlugins() {
  return await Dialog.select<string[]>({
    title: 'Select plugins to export',
    defaultValue: [],
    onValidate: (plugins) =>
      plugins.length === 0 ? 'Please select at least one plugin.' : '',
    renderer: (value, onChange, onCancel) => (
      <ExportDataPluginSheet
        onHide={onCancel}
        selectedPlugins={value}
        setSelectedPlugins={onChange}
      />
    ),
  });
}
