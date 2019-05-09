/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Server from '../server.js';
import {init as initLogger} from '../fb-stubs/Logger';
import reducers from '../reducers/index.js';
import {createStore} from 'redux';
import path from 'path';
import os from 'os';
import fs from 'fs';
import androidDevice from '../dispatcher/androidDevice';
import iosDevice from '../dispatcher/iOSDevice';
import type Client from '../Client';

let server;
const store = createStore(reducers);

beforeAll(() => {
  // create config directory, which is usually created by static/index.js
  const flipperDir = path.join(os.homedir(), '.flipper');
  if (!fs.existsSync(flipperDir)) {
    fs.mkdirSync(flipperDir);
  }

  const logger = initLogger(store);

  androidDevice(store, logger);
  iosDevice(store, logger);

  server = new Server(logger, store);
  return server.init();
});

test('Device can connect successfully', done => {
  var testFinished = false;
  var disconnectedTooEarly = false;
  const registeredClients = [];
  server.addListener('new-client', (client: Client) => {
    // Check there is a connected device that has the same device_id as the new client
    const deviceId = client.query.device_id;
    expect(deviceId).toBeTruthy();
    const devices = store.getState().connections.devices;
    expect(devices.map(device => device.serial)).toContain(deviceId);

    // Make sure it only connects once
    registeredClients.push(client);
    expect(registeredClients).toHaveLength(1);

    // Make sure client stays connected for some time before passing test
    setTimeout(() => {
      testFinished = true;
      expect(disconnectedTooEarly).toBe(false);
      done();
    }, 5000);
  });
  server.addListener('removed-client', (id: string) => {
    if (!testFinished) {
      disconnectedTooEarly = true;
    }
  });
}, 20000);

afterAll(() => {
  return server.close();
});
