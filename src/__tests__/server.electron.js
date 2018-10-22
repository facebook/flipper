/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Server, {SECURE_PORT, INSECURE_PORT} from '../server.js';
import LogManager from '../fb-stubs/Logger';
import reducers from '../reducers/index.js';
import configureStore from 'redux-mock-store';
import path from 'path';
import os from 'os';
import fs from 'fs';

let server;
const mockStore = configureStore([])(reducers(undefined, {type: 'INIT'}));

beforeAll(() => {
  // create config directory, which is usually created by static/index.js
  const flipperDir = path.join(os.homedir(), '.flipper');
  if (!fs.existsSync(flipperDir)) {
    fs.mkdirSync(flipperDir);
  }

  server = new Server(new LogManager(), mockStore);
  return server.init();
});

test('servers starting at ports', done => {
  const serversToBeStarted = new Set([SECURE_PORT, INSECURE_PORT]);

  return new Promise((resolve, reject) => {
    server.addListener('listening', port => {
      if (!serversToBeStarted.has(port)) {
        throw Error(`unknown server started at port ${port}`);
      } else {
        serversToBeStarted.delete(port);
      }
      if (serversToBeStarted.size === 0) {
        done();
        resolve();
      }
    });
  });
});

test.skip(
  'Layout plugin is connecting',
  done => {
    server.addListener('new-client', (client: Client) => {
      done();
    });
  },
  10000,
);

afterAll(() => {
  server.close();
});
