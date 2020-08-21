/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Server from '../server';

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import Client from '../Client';
import {UninitializedClient} from '../UninitializedClient';
import {addErrorNotification} from '../reducers/notifications';

export default (store: Store, logger: Logger) => {
  const server = new Server(logger, store);
  server.init();

  server.addListener('new-client', (client: Client) => {
    store.dispatch({
      type: 'NEW_CLIENT',
      payload: client,
    });
  });

  server.addListener('removed-client', (id: string) => {
    store.dispatch({
      type: 'CLIENT_REMOVED',
      payload: id,
    });
    store.dispatch({
      type: 'CLEAR_PLUGIN_STATE',
      payload: {
        clientId: id,
        devicePlugins: new Set([
          ...store.getState().plugins.devicePlugins.keys(),
        ]),
      },
    });
  });

  server.addListener('error', (err) => {
    store.dispatch(
      addErrorNotification(
        'Failed to start websocket server',
        err.code === 'EADDRINUSE'
          ? "Couldn't start websocket server. Looks like you have multiple copies of Flipper running."
          : err.message || 'Unknown error',
      ),
    );
  });

  server.addListener('start-client-setup', (client: UninitializedClient) => {
    store.dispatch({
      type: 'START_CLIENT_SETUP',
      payload: client,
    });
  });

  server.addListener(
    'finish-client-setup',
    (payload: {client: UninitializedClient; deviceId: string}) => {
      store.dispatch({
        type: 'FINISH_CLIENT_SETUP',
        payload: payload,
      });
    },
  );

  server.addListener(
    'client-setup-error',
    ({client, error}: {client: UninitializedClient; error: Error}) => {
      store.dispatch(
        addErrorNotification(
          `Connection to '${client.appName}' on '${client.deviceName}' failed`,
          'Failed to start client connection',
          error,
        ),
      );
    },
  );

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      server.close();
    });
  }
  return server.close;
};
