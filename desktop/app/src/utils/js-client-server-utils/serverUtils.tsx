/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Client, {ClientQuery} from '../../Client';
import {FlipperClientConnection} from '../../Client';
import {ipcRenderer, remote, IpcRendererEvent} from 'electron';
import JSDevice from '../../devices/JSDevice';
import {Store} from '../../reducers';
import {Logger} from '../../fb-interfaces/Logger';

import {Payload, ConnectionStatus, ISubscriber} from 'rsocket-types';
import {Flowable, Single} from 'rsocket-flowable';
import Server from '../../comms/server';
import {buildClientId} from '../clientUtils';
import {destroyDevice} from '../../reducers/connections';

const connections: Map<number, JSClientFlipperConnection<any>> = new Map();

const availablePlugins: Map<number, Array<string>> = new Map();

function jsDeviceId(windowId: number): string {
  return 'test_js_device' + windowId;
}

export function initJsEmulatorIPC(
  store: Store,
  logger: Logger,
  flipperServer: Server,
  flipperConnections: Map<
    string,
    {
      connection: FlipperClientConnection<any, any> | null | undefined;
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

      connection.connectionStatus().subscribe({
        onNext(payload) {
          if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
            console.debug(`Device disconnected ${client.id}`, 'server');
            flipperServer.removeConnection(client.id);
            destroyDevice(store, logger, jsDeviceId(windowId));
            connections.delete(windowId);
            availablePlugins.delete(windowId);
          }
        },
        onSubscribe(subscription) {
          subscription.request(Number.MAX_SAFE_INTEGER);
        },
      });

      client.init().then(() => {
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
      });
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

export class JSClientFlipperConnection<M>
  implements FlipperClientConnection<string, M>
{
  webContentsId: number;
  connStatusSubscribers: Set<ISubscriber<ConnectionStatus>> = new Set();
  connStatus: ConnectionStatus;

  constructor(webContentsId: number) {
    this.webContentsId = webContentsId;
    this.connStatus = {kind: 'CONNECTED'};
  }

  connectionStatus(): Flowable<ConnectionStatus> {
    return new Flowable<ConnectionStatus>((subscriber) => {
      subscriber.onSubscribe({
        cancel: () => {
          this.connStatusSubscribers.delete(subscriber);
        },
        request: (_) => {
          this.connStatusSubscribers.add(subscriber);
          subscriber.onNext(this.connStatus);
        },
      });
    });
  }

  close(): void {
    this.connStatus = {kind: 'CLOSED'};
    this.connStatusSubscribers.forEach((subscriber) => {
      subscriber.onNext(this.connStatus);
    });
  }

  fireAndForget(payload: Payload<string, M>): void {
    ipcRenderer.sendTo(
      this.webContentsId,
      'message-to-plugin',
      JSON.parse(payload.data != null ? payload.data : '{}'),
    );
  }

  // TODO: fully implement and return actual result
  requestResponse(payload: Payload<string, M>): Single<Payload<string, M>> {
    return new Single((subscriber) => {
      const method =
        payload.data != null ? JSON.parse(payload.data).method : 'not-defined';
      if (method != 'getPlugins') {
        this.fireAndForget(payload);
      }
      subscriber.onSubscribe(() => {});
      subscriber.onComplete(
        method == 'getPlugins'
          ? {
              data: JSON.stringify({
                success: {plugins: availablePlugins.get(this.webContentsId)},
              }),
            }
          : {data: JSON.stringify({success: null})},
      );
    });
  }
}
