/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {State, Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {FlipperServerImpl} from '../server/FlipperServerImpl';
import {selectClient, selectDevice} from '../reducers/connections';
import Client from '../Client';
import {notification} from 'antd';
import BaseDevice from '../devices/BaseDevice';
import {ClientDescription, timeout} from 'flipper-plugin';
import {reportPlatformFailures} from '../utils/metrics';
import {sideEffect} from '../utils/sideEffect';

export default async (store: Store, logger: Logger) => {
  const {enableAndroid, androidHome, idbPath, enableIOS, enablePhysicalIOS} =
    store.getState().settingsState;
  const server = new FlipperServerImpl(
    {
      enableAndroid,
      androidHome,
      idbPath,
      enableIOS,
      enablePhysicalIOS,
      serverPorts: store.getState().application.serverPorts,
    },
    store,
    logger,
  );

  store.dispatch({
    type: 'SET_FLIPPER_SERVER',
    payload: server,
  });

  server.on('notification', (notif) => {
    notification.open({
      message: notif.title,
      description: notif.description,
      type: notif.type,
    });
  });

  server.on('server-error', (err) => {
    notification.error({
      message: 'Failed to start connection server',
      description:
        err.code === 'EADDRINUSE' ? (
          <>
            Couldn't start connection server. Looks like you have multiple
            copies of Flipper running or another process is using the same
            port(s). As a result devices will not be able to connect to Flipper.
            <br />
            <br />
            Please try to kill the offending process by running{' '}
            <code>kill $(lsof -ti:PORTNUMBER)</code> and restart flipper.
            <br />
            <br />
            {'' + err}
          </>
        ) : (
          <>Failed to start Flipper server: ${err.message}</>
        ),
      duration: null,
    });
  });

  server.on('device-connected', (deviceInfo) => {
    logger.track('usage', 'register-device', {
      os: deviceInfo.os,
      name: deviceInfo.title,
      serial: deviceInfo.serial,
    });

    const existing = store
      .getState()
      .connections.devices.find(
        (device) => device.serial === deviceInfo.serial,
      );
    // handled outside reducer, as it might emit new redux actions...
    if (existing) {
      if (existing.connected.get()) {
        console.warn(
          `Tried to replace still connected device '${existing.serial}' with a new instance.`,
        );
      }
      existing.destroy();
    }

    const device = new BaseDevice(server, deviceInfo);
    device.loadDevicePlugins(
      store.getState().plugins.devicePlugins,
      store.getState().connections.enabledDevicePlugins,
    );

    store.dispatch({
      type: 'REGISTER_DEVICE',
      payload: device,
    });
  });

  server.on('device-disconnected', (device) => {
    logger.track('usage', 'unregister-device', {
      os: device.os,
      serial: device.serial,
    });
    // N.B.: note that we don't remove the device, we keep it in offline
  });

  server.on('client-connected', (payload: ClientDescription) =>
    handleClientConnected(server, store, logger, payload),
  );

  server.on('client-disconnected', ({id}) => {
    const existingClient = store.getState().connections.clients.get(id);
    existingClient?.disconnect();
  });

  server.on('client-message', ({id, message}) => {
    const existingClient = store.getState().connections.clients.get(id);
    existingClient?.onMessage(message);
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      server.close();
    });
  }

  server
    .start()
    .then(() => {
      console.log(
        'Flipper server started and accepting device / client connections',
      );
    })
    .catch((e) => {
      console.error('Failed to start Flipper server', e);
      notification.error({
        message: 'Failed to start Flipper server',
        description: 'error: ' + e,
      });
    });

  return () => {
    server.close();
  };
};

export async function handleClientConnected(
  server: FlipperServerImpl,
  store: Store,
  logger: Logger,
  {id, query}: ClientDescription,
) {
  const {connections} = store.getState();
  const existingClient = connections.clients.get(id);

  if (existingClient) {
    existingClient.destroy();
    store.dispatch({
      type: 'CLEAR_CLIENT_PLUGINS_STATE',
      payload: {
        clientId: id,
        devicePlugins: new Set(),
      },
    });
    store.dispatch({
      type: 'CLIENT_REMOVED',
      payload: id,
    });
  }

  const device =
    getDeviceBySerial(store.getState(), query.device_id) ??
    (await findDeviceForConnection(store, query.app, query.device_id));

  const client = new Client(
    id,
    query,
    {
      send(data: any) {
        server.exec('client-request', id, data);
      },
      async sendExpectResponse(data: any) {
        return await server.exec('client-request-response', id, data);
      },
    },
    logger,
    store,
    undefined,
    device,
  );

  console.debug(
    `Device client initialized: ${client.id}. Supported plugins: ${Array.from(
      client.plugins,
    ).join(', ')}`,
    'server',
  );

  store.dispatch({
    type: 'NEW_CLIENT',
    payload: client,
  });

  store.dispatch(selectClient(client.id));

  await timeout(
    30 * 1000,
    client.init(),
    `[conn] Failed to initialize client ${query.app} on ${query.device_id} in a timely manner`,
  );
}

function getDeviceBySerial(
  state: State,
  serial: string,
): BaseDevice | undefined {
  return state.connections.devices.find((device) => device.serial === serial);
}

async function findDeviceForConnection(
  store: Store,
  clientId: string,
  serial: string,
): Promise<BaseDevice> {
  let lastSeenDeviceList: BaseDevice[] = [];
  /* All clients should have a corresponding Device in the store.
     However, clients can connect before a device is registered, so wait a
     while for the device to be registered if it isn't already. */
  return reportPlatformFailures(
    new Promise<BaseDevice>((resolve, reject) => {
      let unsubscribe: () => void = () => {};

      const timeout = setTimeout(() => {
        unsubscribe();
        const error = `Timed out waiting for device ${serial} for client ${clientId}`;
        console.error(
          '[conn] Unable to find device for connection. Error:',
          error,
        );
        reject(error);
      }, 15000);
      unsubscribe = sideEffect(
        store,
        {name: 'waitForDevice', throttleMs: 100},
        (state) => state.connections.devices,
        (newDeviceList) => {
          if (newDeviceList === lastSeenDeviceList) {
            return;
          }
          lastSeenDeviceList = newDeviceList;
          const matchingDevice = newDeviceList.find(
            (device) => device.serial === serial,
          );
          if (matchingDevice) {
            console.log(`[conn] Found device for: ${clientId} on ${serial}.`);
            clearTimeout(timeout);
            resolve(matchingDevice);
            unsubscribe();
          }
        },
      );
    }),
    'client-setMatchingDevice',
  );
}
