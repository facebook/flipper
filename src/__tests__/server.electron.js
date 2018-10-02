/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Server, {SECURE_PORT, INSECURE_PORT} from '../server.js';
import LogManager from '../fb-stubs/Logger';
import path from 'path';
import os from 'os';
import fs from 'fs';

let server;

beforeAll(() => {
  // create config directory, which is usually created by static/index.js
  const flipperDir = path.join(os.homedir(), '.flipper');
  if (!fs.existsSync(flipperDir)) {
    fs.mkdirSync(flipperDir);
  }

  server = new Server(new LogManager());
});

test('servers starting at ports', done => {
  const serversToBeStarted = new Set([SECURE_PORT, INSECURE_PORT]);

  server.addListener('listening', port => {
    if (!serversToBeStarted.has(port)) {
      done.fail(Error(`unknown server started at port ${port}`));
    } else {
      serversToBeStarted.delete(port);
    }
    if (serversToBeStarted.size === 0) {
      done();
    }
  });
});

afterAll(() => {
  server.close();
});
