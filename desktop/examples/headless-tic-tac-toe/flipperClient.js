/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class FlipperServerClient {
  messageId = 0;
  wsClient = new WebSocket('ws://localhost:52342?server_companion=true');
  execReqs = new Map();
  eventBus = new EventEmitter();

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
        case 'companion-event': {
          this.eventBus.emit(payload.event, payload.data);
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

  on(eventName, cb) {
    this.eventBus.on(eventName, cb);
  }
}

module.exports = {
  FlipperServerClient,
};
