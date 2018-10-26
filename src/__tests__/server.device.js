/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Server from '../server.js';
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

test(
  'Device can connect successfully',
  done => {
    var testFinished = false;
    server.addListener('new-client', (client: Client) => {
      console.debug('new-client ' + new Date().toString());
      setTimeout(() => {
        testFinished = true;
        done();
      }, 5000);
    });
    server.addListener('removed-client', (id: string) => {
      console.debug('removed-client ' + new Date().toString());
      if (!testFinished) {
        done.fail('client disconnected too early');
      }
    });
  },
  20000,
);

afterAll(() => {
  return server.close();
});
