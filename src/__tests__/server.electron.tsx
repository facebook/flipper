/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.mock('../fb/Logger');
try {
  jest.mock('../fb/Logger');
} catch {
  // Allowed to fail when fb modules are not present.
}

import {init as initLogger} from '../fb-stubs/Logger';
import Server from '../server';
import reducers, {Store} from '../reducers/index';
import configureStore from 'redux-mock-store';
import path from 'path';
import os from 'os';
import fs from 'fs';

let server: Server | null = null;
const mockStore: Store = configureStore([])(
  reducers(undefined, {type: 'INIT'}),
) as Store;

beforeAll(() => {
  // create config directory, which is usually created by static/index.js
  const flipperDir = path.join(os.homedir(), '.flipper');
  if (!fs.existsSync(flipperDir)) {
    fs.mkdirSync(flipperDir);
  }

  const logger = initLogger(mockStore);
  server = new Server(logger, mockStore);
});

test('servers starting at ports', done => {
  const ports = mockStore.getState().application.serverPorts;
  const serversToBeStarted = new Set([ports.secure, ports.insecure]);

  // Resolve promise when we get a listen event for each port
  const listenerPromise = new Promise((resolve, reject) => {
    server!.addListener('listening', port => {
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

  // Initialise server after the listeners have been setup
  server!.init();

  return listenerPromise;
});

afterAll(() => {
  return server!.close();
});
