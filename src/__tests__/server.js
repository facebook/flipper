/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type Client from '../Client';

import Server, {SECURE_PORT, INSECURE_PORT} from '../server.js';
import LogManager from '../fb-stubs/Logger';

let server;

beforeAll(() => {
  server = new Server(new LogManager());
});

test('servers starting at ports', done => {
  const serversToBeStarted = new Set([SECURE_PORT, INSECURE_PORT]);

  server.addListener('listening', port => {
    if (!serversToBeStarted.has(port)) {
      throw Error(`unknown server started at port ${port}`);
    } else {
      serversToBeStarted.delete(port);
    }
    if (serversToBeStarted.size === 0) {
      done();
    }
  });
});

test('Layout plugin is connecting', done => {
  server.addListener('new-client', (client: Client) => {
    if (client.plugins.indexOf('Inspector -') === -1) {
      done.fail(new Error('Layout inspector plugin not found'));
    } else {
      done();
    }
  });
});

afterAll(() => {
  server.close();
});
