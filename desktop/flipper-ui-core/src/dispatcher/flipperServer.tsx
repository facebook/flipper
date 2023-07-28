/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {State, Store} from '../reducers/index';
import {
  FlipperServer,
  Logger,
  NoLongerConnectedToClientError,
  isTest,
  DeviceDescription,
  FlipperServerState,
} from 'flipper-common';
import Client from '../Client';
import {Button, notification} from 'antd';
import {BaseDevice} from 'flipper-frontend-core';
import {ClientDescription, timeout} from 'flipper-common';
import {reportPlatformFailures} from 'flipper-common';
import {sideEffect} from '../utils/sideEffect';
import {waitFor} from '../utils/waitFor';
import {NotificationBody} from '../ui/components/NotificationBody';
import {Layout} from '../ui';
import {setStaticView} from '../reducers/connections';
import {ConnectivityHub} from '../chrome/ConnectivityHub';
import {setTopLevelSelection} from '../reducers/application';

export function connectFlipperServerToStore(
  server: FlipperServer,
  store: Store,
  logger: Logger,
) {
  server.on('notification', ({type, title, description}) => {
    const text = `[${type}] ${title}: ${description}`;
    console.warn(text);
    notification.open({
      message: title,
      description: <NotificationBody text={description} />,
      type: type,
      duration: 0,
      key: text,
    });
  });

  server.on('server-state', handleServerStateChange);

  server.on('server-error', (err) => {
    if (err.code === 'EADDRINUSE') {
      handeEADDRINUSE('' + err);
    } else {
      const text = err.message ?? err;
      notification.error({
        key: text,
        message: 'Connection error',
        description: <NotificationBody text={text} />,
        duration: null,
      });
    }
  });

  server.on('device-connected', (deviceInfo) => {
    handleDeviceConnected(server, store, logger, deviceInfo);
  });

  server.on('device-disconnected', (deviceInfo) => {
    // N.B.: note that we don't remove the device, we keep it in offline
    handleDeviceDisconnected(store, logger, deviceInfo);
  });

  server.on('client-setup', (client) => {
    store.dispatch({
      type: 'START_CLIENT_SETUP',
      payload: client,
    });
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

  let sideEffectDisposer: undefined | (() => void);

  if (!isTest()) {
    sideEffectDisposer = startSideEffects(store, server);
  }
  console.log(
    'Flipper server started and accepting device / client connections',
  );

  server
    .exec('get-server-state')
    .then(handleServerStateChange)
    .catch((e) => {
      console.error(`Failed to get initial server state`, e);
    });

  // this flow is spawned delibarately from this main flow
  waitFor(store, (state) => state.plugins.initialized)
    .then(() => server.exec('device-list'))
    .then((devices) => {
      // register all devices
      devices.forEach((device) => {
        handleDeviceConnected(server, store, logger, device);
      });
    })
    .then(() => server.exec('client-list'))
    .then((clients) => {
      clients.forEach((client) => {
        handleClientConnected(server, store, logger, client);
      });
    })
    .catch((e) => {
      console.error('Failed to get initial device/client list: ', e);
    });

  return () => {
    sideEffectDisposer?.();
    server.close();
  };
}

function startSideEffects(store: Store, server: FlipperServer) {
  const dispose1 = sideEffect(
    store,
    {
      name: 'settingsPersistor',
      throttleMs: 100,
    },
    (state) => state.settingsState,
    (settings) => {
      server.exec('persist-settings', settings).catch((e) => {
        console.error('Failed to persist Flipper settings', e);
      });
    },
  );

  const dispose2 = sideEffect(
    store,
    {
      name: 'launcherSettingsPersistor',
      throttleMs: 100,
    },
    (state) => state.launcherSettingsState,
    (settings) => {
      server.exec('persist-launcher-settings', settings).catch((e) => {
        console.error('Failed to persist launcher settings', e);
      });
    },
  );

  return () => {
    dispose1();
    dispose2();
  };
}

function handleServerStateChange({
  state,
  error,
}: {
  state: FlipperServerState;
  error?: string;
}) {
  if (state === 'error') {
    console.warn(`[conn] Flipper server state -> ${state}`, error);
    if (error?.includes('EADDRINUSE')) {
      handeEADDRINUSE(error);
    } else {
      notification.error({
        message: 'Failed to start flipper-server',
        description: '' + error,
        duration: null,
      });
    }
  } else {
    console.info(`[conn] Flipper server state -> ${state}`);
  }
}

function handeEADDRINUSE(errorMessage: string) {
  notification.error({
    message: 'Connection error',
    description: (
      <>
        Couldn't start connection server. Looks like you have multiple copies of
        Flipper running or another process is using the same port(s). As a
        result devices will not be able to connect to Flipper.
        <br />
        <br />
        Please try to kill the offending process by running{' '}
        <code>kill $(lsof -ti:PORTNUMBER)</code> and restart flipper.
        <br />
        <br />
        {errorMessage}
      </>
    ),
    duration: null,
  });
}

export function handleDeviceConnected(
  server: FlipperServer,
  store: Store,
  logger: Logger,
  deviceInfo: DeviceDescription,
) {
  logger.track('usage', 'register-device', {
    os: deviceInfo.os,
    name: deviceInfo.title,
    serial: deviceInfo.serial,
  });

  const existing = store
    .getState()
    .connections.devices.find((device) => device.serial === deviceInfo.serial);
  // handled outside reducer, as it might emit new redux actions...
  if (existing) {
    if (existing.connected.get()) {
      console.warn(
        `Tried to replace still connected device '${existing.serial}' with a new instance.`,
      );
    }
    if (store.getState().settingsState.persistDeviceData) {
      //Recycle device
      existing?.connected.set(true);
      store.dispatch({
        type: 'SELECT_DEVICE',
        payload: existing,
      });
      return;
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
}

export function handleDeviceDisconnected(
  store: Store,
  logger: Logger,
  deviceInfo: DeviceDescription,
) {
  logger.track('usage', 'unregister-device', {
    os: deviceInfo.os,
    serial: deviceInfo.serial,
  });
  const existing = store
    .getState()
    .connections.devices.find((device) => device.serial === deviceInfo.serial);
  existing?.connected.set(false);
}

export async function handleClientConnected(
  server: FlipperServer,
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

  console.log(
    `[conn] Searching matching device ${query.device_id} for client ${query.app}...`,
  );
  const device =
    getDeviceBySerial(store.getState(), query.device_id) ??
    (await findDeviceForConnection(store, query.app, query.device_id).catch(
      (e) => {
        console.warn(
          `[conn] Failed to find device '${query.device_id}' while connection app '${query.app}'`,
          e,
        );
        const key = `device-find-failure-${query.device_id}`;
        notification.error({
          key,
          message: 'Connection failed',
          description: (
            <Layout.Bottom>
              <p>
                Failed to find device '{query.device_id}' while trying to
                connect app '{query.app}'`
              </p>
              <div>
                <Button
                  type="primary"
                  style={{float: 'right'}}
                  onClick={() => {
                    store.dispatch(setTopLevelSelection('connectivity'));
                    store.dispatch(setStaticView(ConnectivityHub));
                    notification.close(key);
                  }}>
                  Troubleshoot
                </Button>
              </div>
            </Layout.Bottom>
          ),
          duration: 0,
        });
      },
    ));

  if (!device) {
    return;
  }

  const client = new Client(
    id,
    query,
    {
      send(data: any) {
        server.exec('client-request', id, data).catch((e) => {
          console.warn(e);
        });
      },
      async sendExpectResponse(data: any) {
        return await server.exec('client-request-response', id, data);
      },
    },
    logger,
    store,
    undefined,
    device,
    server,
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
  try {
    await timeout(
      30 * 1000,
      client.init(),
      `[conn] Failed to initialize client ${query.app} on ${query.device_id} in a timely manner`,
    );
    console.log(
      `[conn] ${query.app} on ${query.device_id} connected and ready.`,
    );
  } catch (e) {
    if (e instanceof NoLongerConnectedToClientError) {
      console.warn(
        `[conn] Client ${query.app} on ${query.device_id} disconnected while initialising`,
      );
      return;
    }
    console.warn(`[conn] Failed to handle client connected: ${e}`);
  }
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
        reject(
          new Error(
            `Timed out waiting for device ${serial} for client ${clientId}`,
          ),
        );
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
