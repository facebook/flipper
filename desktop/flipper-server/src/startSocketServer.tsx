/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import chalk from 'chalk';
import {FlipperServerImpl} from 'flipper-server-core';
import socketio from 'socket.io';

export function startSocketServer(
  flipperServer: FlipperServerImpl,
  socket: socketio.Server,
) {
  socket.on('connection', (client) => {
    console.log(chalk.green(`Client connected ${client.id}`));

    let connected = true;

    function onServerEvent(event: string, payoad: any) {
      client.emit('event', event, payoad);
    }

    flipperServer.onAny(onServerEvent);

    client.on('exec', (id, command, args) => {
      flipperServer
        .exec(command, ...args)
        .then((result: any) => {
          if (connected) {
            client.emit('exec-response', id, result);
          }
        })
        .catch((error: any) => {
          if (connected) {
            // TODO: Serialize error
            client.emit('exec-response-error', id, error.toString());
          }
        });
    });

    client.on('disconnect', () => {
      console.log(chalk.red(`Client disconnected ${client.id}`));
      connected = false;
      flipperServer.offAny(onServerEvent);
    });

    client.on('error', (e) => {
      console.error(chalk.red(`Socket error ${client.id}`), e);
      connected = false;
      flipperServer.offAny(onServerEvent);
    });
  });
}
