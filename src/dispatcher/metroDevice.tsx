/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {registerDeviceCallbackOnPlugins} from '../utils/onRegisterDevice';
import MetroDevice from '../devices/MetroDevice';
import {ArchivedDevice} from 'flipper';

const METRO_PORT = 8081;
const METRO_HOST = 'localhost';
const METRO_URL = `http://${METRO_HOST}:${METRO_PORT}`;
const METRO_LOGS_ENDPOINT = `ws://${METRO_HOST}:${METRO_PORT}/events`;
const METRO_MESSAGE = ['React Native packager is running', 'Metro is running'];
const QUERY_INTERVAL = 5000;
const METRO_DEVICE_ID = 'metro'; // there is always only one activve

async function isMetroRunning(): Promise<boolean> {
  try {
    const contents = await (await global.fetch(METRO_URL)).text();
    return METRO_MESSAGE.some(msg => contents.includes(msg));
  } catch (e) {
    return false;
  }
}

async function registerDevice(ws: WebSocket, store: Store, logger: Logger) {
  const metroDevice = new MetroDevice(METRO_DEVICE_ID, ws);
  logger.track('usage', 'register-device', {
    os: 'Metro',
    name: metroDevice.title,
  });

  metroDevice.loadDevicePlugins(store.getState().plugins.devicePlugins);
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: metroDevice,
    serial: METRO_DEVICE_ID,
  });

  registerDeviceCallbackOnPlugins(
    store,
    store.getState().plugins.devicePlugins,
    store.getState().plugins.clientPlugins,
    metroDevice,
  );
}

async function unregisterDevices(store: Store, logger: Logger) {
  logger.track('usage', 'unregister-device', {
    os: 'Metro',
    serial: METRO_DEVICE_ID,
  });

  let archivedDevice: ArchivedDevice | undefined = undefined;
  const device = store
    .getState()
    .connections.devices.find(device => device.serial === METRO_DEVICE_ID);
  if (device && !device.isArchived) {
    archivedDevice = device.archive();
  }

  store.dispatch({
    type: 'UNREGISTER_DEVICES',
    payload: new Set([METRO_DEVICE_ID]),
  });

  if (archivedDevice) {
    archivedDevice.loadDevicePlugins(store.getState().plugins.devicePlugins);
    store.dispatch({
      type: 'REGISTER_DEVICE',
      payload: archivedDevice,
    });
  }
}

export default (store: Store, logger: Logger) => {
  let timeoutHandle: NodeJS.Timeout;
  let ws: WebSocket | undefined;

  async function tryConnectToMetro() {
    if (ws) {
      return;
    }

    if (await isMetroRunning()) {
      const _ws = new WebSocket(METRO_LOGS_ENDPOINT);

      _ws.onopen = () => {
        clearTimeout(guard);
        ws = _ws;
        registerDevice(ws, store, logger);
      };

      _ws.onclose = _ws.onerror = () => {
        clearTimeout(guard);
        ws = undefined;
        unregisterDevices(store, logger);
        scheduleNext();
      };

      const guard = setTimeout(() => {
        // Metro is running, but didn't respond to /events endpoint
        store.dispatch({
          type: 'SERVER_ERROR',
          payload: {
            message:
              "Found a running Metro instance, but couldn't connect to the logs. Probably your React Native version is too old to support Flipper.",
            details: `Failed to get a connection to ${METRO_LOGS_ENDPOINT} in a timely fashion`,
            urgent: true,
          },
        });
        // Note: no scheduleNext, we won't retry until restart
      }, 5000);
    } else {
      scheduleNext();
    }
  }

  function scheduleNext() {
    timeoutHandle = setTimeout(tryConnectToMetro, QUERY_INTERVAL);
  }

  tryConnectToMetro();

  // cleanup method
  return () => {
    if (ws) {
      ws.close();
    }
    if (timeoutHandle) {
      clearInterval(timeoutHandle);
    }
  };
};
