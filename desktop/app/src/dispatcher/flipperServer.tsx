/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {FlipperServer} from '../server/FlipperServer';
import {selectClient, selectDevice} from '../reducers/connections';
import Client from '../Client';
import {notification} from 'antd';

export default async (store: Store, logger: Logger) => {
  const {enableAndroid, androidHome, idbPath, enableIOS, enablePhysicalIOS} =
    store.getState().settingsState;
  const server = new FlipperServer(
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

  server.on('device-connected', (device) => {
    logger.track('usage', 'register-device', {
      os: device.os,
      name: device.title,
      serial: device.serial,
    });

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

  server.on('client-connected', (payload) =>
    handleClientConnected(store, payload),
  );

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

export async function handleClientConnected(store: Store, client: Client) {
  const {connections} = store.getState();
  const existingClient = connections.clients.find((c) => c.id === client.id);

  if (existingClient) {
    existingClient.destroy();
    store.dispatch({
      type: 'CLEAR_CLIENT_PLUGINS_STATE',
      payload: {
        clientId: client.id,
        devicePlugins: new Set(),
      },
    });
    store.dispatch({
      type: 'CLIENT_REMOVED',
      payload: client.id,
    });
  }

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

  // eslint-disable-next-line node/no-sync
  const device = client.deviceSync;
  if (device) {
    store.dispatch(selectDevice(device));
    store.dispatch(selectClient(client.id));
  }

  client.emit('plugins-change');
}
