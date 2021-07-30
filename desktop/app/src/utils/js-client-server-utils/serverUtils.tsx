/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Client, {ClientQuery} from '../../Client';
import {
  ClientConnection,
  ConnectionStatus,
  ConnectionStatusChange,
  ResponseType,
} from '../../comms/ClientConnection';
import {ipcRenderer, remote, IpcRendererEvent} from 'electron';
import JSDevice from '../../devices/JSDevice';
import {Store} from '../../reducers';
import {Logger} from '../../fb-interfaces/Logger';
import ServerController from '../../comms/ServerController';
import {buildClientId} from '../clientUtils';
import {destroyDevice} from '../../reducers/connections';

const connections: Map<number, JSClientFlipperConnection> = new Map();

const availablePlugins: Map<number, Array<string>> = new Map();

function jsDeviceId(windowId: number): string {
  return 'test_js_device' + windowId;
}

export function initJsEmulatorIPC(
  store: Store,
  logger: Logger,
  flipperServer: ServerController,
  flipperConnections: Map<
    string,
    {
      connection: ClientConnection | null | undefined;
      client: Client;
    }
  >,
) {
  ipcRenderer.on(
    'from-js-emulator-init-client',
    (_event: IpcRendererEvent, message: any) => {
      const {windowId} = message;
      const {plugins, appName} = message.payload;
      const device = new JSDevice(jsDeviceId(windowId), 'jsEmulator', windowId);
      store.dispatch({
        type: 'REGISTER_DEVICE',
        payload: device,
      });

      const connection = new JSClientFlipperConnection(windowId);
      connections.set(windowId, connection);
      availablePlugins.set(windowId, plugins);

      const query: ClientQuery = {
        app: appName,
        os: 'JSWebApp',
        device: 'jsEmulator',
        device_id: jsDeviceId(windowId),
        sdk_version: 2, // hack to bybass callbacks in Client, will be fixed when JS Connection will be fully implemented
      };
      const clientId = buildClientId(query);

      const client = new Client(
        clientId,
        query,
        connection,
        logger,
        store,
        plugins,
        device,
      );

      flipperConnections.set(clientId, {
        connection: connection,
        client: client,
      });

      connection.subscribeToEvents((status) => {
        if (
          status == ConnectionStatus.ERROR ||
          status == ConnectionStatus.CLOSED
        ) {
          console.debug(`Device disconnected ${client.id}`, 'server');
          flipperServer.removeConnection(client.id);
          destroyDevice(store, logger, jsDeviceId(windowId));
          connections.delete(windowId);
          availablePlugins.delete(windowId);
        }
      });

      client
        .init()
        .then(() => {
          console.log(client);
          flipperServer.emit('new-client', client);
          flipperServer.emit('clients-change');
          client.emit('plugins-change');

          ipcRenderer.on(
            'from-js-emulator',
            (_event: IpcRendererEvent, message: any) => {
              const {command, payload} = message;
              if (command === 'sendFlipperObject') {
                client.onMessage(
                  JSON.stringify({
                    params: {
                      api: payload.api,
                      method: payload.method,
                      params: JSON.parse(payload.params),
                    },
                    method: 'execute',
                  }),
                );
              }
            },
          );
        })
        .catch((_) => {});
    },
  );
}

export function launchJsEmulator(url: string, height: number, width: number) {
  const BrowserWindow = remote.BrowserWindow;
  const win = new BrowserWindow({
    height: height,
    width: width,
    webPreferences: {
      enableRemoteModule: true,
      preload: require('path').join(
        remote.app.getAppPath(),
        'SupportJSClientPreload.js',
      ),
      nodeIntegration: false,
      contextIsolation: false,
      allowRunningInsecureContent: true,
    },
  });

  win.webContents.on('preload-error', (_event, path, error) => {
    console.log(path, error);
  });

  win.loadURL(url);

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('parent-window-id', remote.getCurrentWebContents().id);

    const childWindowId = win.webContents.id;
    win.on('closed', () => {
      connections.get(childWindowId)?.close();
    });
  });
}

export class JSClientFlipperConnection implements ClientConnection {
  webContentsId: number;
  connStatusSubscribers: Set<ConnectionStatusChange> = new Set();
  connStatus: ConnectionStatus;

  constructor(webContentsId: number) {
    this.webContentsId = webContentsId;
    this.connStatus = ConnectionStatus.CONNECTED;
  }
  subscribeToEvents(subscriber: ConnectionStatusChange): void {
    this.connStatusSubscribers.add(subscriber);
  }
  send(data: any): void {
    ipcRenderer.sendTo(
      this.webContentsId,
      'message-to-plugin',
      JSON.parse(data != null ? data : '{}'),
    );
  }
  // TODO: fully implement and return actual result
  sendExpectResponse(data: any): Promise<ResponseType> {
    return new Promise((resolve, _) => {
      const method = data != null ? JSON.parse(data).method : 'not-defined';

      if (method !== 'getPlugins') {
        this.send(data);
      }

      if (method === 'getPlugins') {
        resolve({
          success: {
            plugins: availablePlugins.get(this.webContentsId),
          },
          length: 0,
        });
      } else {
        resolve({
          success: undefined,
          length: 0,
        });
      }
    });
  }
  close(): void {
    this.connStatus = ConnectionStatus.CLOSED;
    this.connStatusSubscribers.forEach((subscriber) => {
      subscriber(this.connStatus);
    });
  }
}
