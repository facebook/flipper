#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const WebSocket = require('ws');

class FlipperServerClient {
  messageId = 0;
  wsClient = new WebSocket('ws://localhost:52342?server_companion=true');
  execReqs = new Map();

  async init() {
    await new Promise((resolve) => this.wsClient.on('open', resolve));

    this.wsClient.on('message', (data) => {
      const {event, payload} = JSON.parse(data);

      switch (event) {
        case 'exec-response':
        case 'exec-response-error': {
          const req = this.execReqs.get(payload.id);

          if (!req) {
            console.warn('Unknown exec request');
            return;
          }

          this.execReqs.delete(payload.id);

          if (event === 'exec-response') {
            req.resolve(payload.data);
          } else {
            req.reject(payload.data);
          }
          return;
        }
      }
    });
  }

  exec(command, args) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;

      this.wsClient.send(
        JSON.stringify({
          event: 'exec',
          payload: {
            id,
            command,
            args,
          },
        }),
      );

      this.execReqs.set(id, {resolve, reject});
    });
  }
}

const main = async () => {
  console.log('main');

  const client = new FlipperServerClient();
  await client.init();

  console.log('Initialized client');

  const devices = await client.exec('device-list', []);

  console.log('Devices', JSON.stringify(devices));

  const targetDevice = devices.find((device) => !!device.serial);

  const availablePlugins = await client.exec('companion-device-plugin-list', [
    targetDevice.serial,
  ]);

  console.log(
    'Available plugins',
    targetDevice.serial,
    JSON.stringify(availablePlugins),
  );

  console.log('Activating headless-demo plugin for', targetDevice.serial);

  await client.exec('companion-device-plugin-start', [
    targetDevice.serial,
    'headless-demo',
  ]);

  console.log('Activated headless-demo plugin');

  console.log('Using increment api');

  const res = await client.exec('companion-device-plugin-exec', [
    targetDevice.serial,
    'headless-demo',
    'increment',
    [3],
  ]);

  console.log('Received a response', JSON.stringify(res));
};

main().catch(console.error);
