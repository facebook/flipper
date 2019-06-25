/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Server from '../server.js';

import type {Store} from '../reducers/index.js';
import type {Logger} from '../fb-interfaces/Logger.js';
import type Client from '../Client.js';
import type {UninitializedClient} from '../UninitializedClient';
import type BaseDevice from '../devices/BaseDevice';

export default (store: Store, logger: Logger) => {
  const server = new Server(logger, store);
  server.init();

  server.addListener('new-client', (client: Client) => {
    store.dispatch({
      type: 'NEW_CLIENT',
      payload: client,
    });
    // Wait 2 seconds, and then trigger another event so we can check it's displayed
    setTimeout(() => {
      store.dispatch({
        type: 'NEW_CLIENT_SANITY_CHECK',
        payload: client,
      });
    }, 2000);
  });

  server.addListener('removed-client', (id: string) => {
    const client: ?Client = store
      .getState()
      .connections.clients.find((client: Client) => client.id === id);
    if (client) {
      const device: ?BaseDevice = store
        .getState()
        .connections.devices.find(
          (device: BaseDevice) => device.serial === client.query.device_id,
        );

      if (device && !device.isArchived && device.os === 'Android') {
        client.connected = false;
        client.connection = null;
        // find all plugins for this client that store data in persistedState
        client.plugins = Object.keys(store.getState().pluginStates)
          .filter(key => key.startsWith(id))
          .map(key => key.split('#').pop());

        // don't remove client if it still has plugins
        if (client.plugins.length > 0) {
          return;
        }
      }
    }

    store.dispatch({
      type: 'CLIENT_REMOVED',
      payload: id,
    });
    store.dispatch({
      type: 'CLEAR_PLUGIN_STATE',
      payload: {
        id,
        devicePlugins: new Set([
          ...store.getState().plugins.devicePlugins.keys(),
        ]),
      },
    });
  });

  server.addListener('error', err => {
    const payload: string =
      err.code === 'EADDRINUSE'
        ? "Couldn't start websocket server. Looks like you have multiple copies of Flipper running."
        : err.message || 'Unknown error';

    store.dispatch({
      type: 'SERVER_ERROR',
      payload,
    });
  });

  server.addListener('start-client-setup', (client: UninitializedClient) => {
    store.dispatch({
      type: 'START_CLIENT_SETUP',
      payload: client,
    });
  });

  server.addListener(
    'finish-client-setup',
    (payload: {client: UninitializedClient, deviceId: string}) => {
      store.dispatch({
        type: 'FINISH_CLIENT_SETUP',
        payload: payload,
      });
    },
  );

  server.addListener(
    'client-setup-error',
    (payload: {client: UninitializedClient, error: Error}) => {
      store.dispatch({
        type: 'CLIENT_SETUP_ERROR',
        payload: payload,
      });
    },
  );

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      server.close();
    });
  }
  return server.close;
};
