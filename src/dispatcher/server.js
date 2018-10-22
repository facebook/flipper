/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Server from '../server.js';

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';
import type Client from '../Client.js';

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
      payload: id,
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

  window.addEventListener('beforeunload', () => {
    server.close();
  });
};
