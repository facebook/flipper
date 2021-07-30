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
import MetroDevice from '../devices/MetroDevice';
import http from 'http';
import {addErrorNotification} from '../reducers/notifications';
import {destroyDevice} from '../reducers/connections';
import {parseEnvironmentVariableAsNumber} from '../utils/environmentVariables';

const METRO_HOST = 'localhost';
const METRO_PORT = parseEnvironmentVariableAsNumber('METRO_SERVER_PORT', 8081);
const METRO_URL = `http://${METRO_HOST}:${METRO_PORT}`;
const METRO_LOGS_ENDPOINT = `ws://${METRO_HOST}:${METRO_PORT}/events`;
const METRO_MESSAGE = ['React Native packager is running', 'Metro is running'];
const QUERY_INTERVAL = 5000;

async function isMetroRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    // We use Node's http library, rather than fetch api, as the latter cannot supress network errors being shown in the devtools console
    // which generates a lot of noise
    http
      .get(METRO_URL, (resp) => {
        let data = '';
        resp
          .on('data', (chunk) => {
            data += chunk;
          })
          .on('end', () => {
            const isMetro = METRO_MESSAGE.some((msg) => data.includes(msg));
            resolve(isMetro);
          });
      })
      .on('error', (err: any) => {
        if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET') {
          console.error('Could not connect to METRO ' + err);
        }
        resolve(false);
      });
  });
}

export async function registerMetroDevice(
  ws: WebSocket | undefined,
  store: Store,
  logger: Logger,
) {
  const metroDevice = new MetroDevice(METRO_URL, ws);
  logger.track('usage', 'register-device', {
    os: 'Metro',
    name: metroDevice.title,
  });

  metroDevice.loadDevicePlugins(
    store.getState().plugins.devicePlugins,
    store.getState().connections.enabledDevicePlugins,
  );
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: metroDevice,
    serial: METRO_URL,
  });
}

export default (store: Store, logger: Logger) => {
  let timeoutHandle: NodeJS.Timeout;
  let ws: WebSocket | undefined;
  let unregistered = false;

  async function tryConnectToMetro() {
    if (ws) {
      return;
    }

    if (await isMetroRunning()) {
      try {
        const _ws = new WebSocket(METRO_LOGS_ENDPOINT);

        _ws.onopen = () => {
          clearTimeout(guard);
          ws = _ws;
          registerMetroDevice(ws, store, logger);
        };

        _ws.onclose = _ws.onerror = function (event?: any) {
          if (event?.type === 'error') {
            console.error(
              `Failed to connect to Metro on ${METRO_LOGS_ENDPOINT}`,
              event,
            );
          }
          if (!unregistered) {
            unregistered = true;
            clearTimeout(guard);
            ws = undefined;
            destroyDevice(store, logger, METRO_URL);
            scheduleNext();
          }
        };

        const guard = setTimeout(() => {
          // Metro is running, but didn't respond to /events endpoint
          store.dispatch(
            addErrorNotification(
              'Failed to connect to Metro',
              `Flipper did find a running Metro instance, but couldn't connect to the logs. Probably your React Native version is too old to support Flipper. Cause: Failed to get a connection to ${METRO_LOGS_ENDPOINT} in a timely fashion`,
            ),
          );
          registerMetroDevice(undefined, store, logger);
          // Note: no scheduleNext, we won't retry until restart
        }, 5000);
      } catch (e) {
        console.error('Error while setting up Metro websocket connect', e);
      }
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
