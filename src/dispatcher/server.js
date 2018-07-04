/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Server from '../server.js';

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';

export default (store: Store, logger: Logger) => {
  const server = new Server(logger);
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
  });

  server.addListener('error', err => {
    const payload: string =
      err.code === 'EADDRINUSE'
        ? "Couldn't start websocket server. Looks like you have multiple copies of Sonar running."
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
