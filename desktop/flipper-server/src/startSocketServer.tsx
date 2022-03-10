/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import chalk from 'chalk';
import {
  ClientWebSocketMessage,
  ExecResponseWebSocketMessage,
  ExecResponseErrorWebSocketMessage,
  ServerEventWebSocketMessage,
} from 'flipper-common';
import {FlipperServerImpl} from 'flipper-server-core';
import {WebSocketServer} from 'ws';

export function startSocketServer(
  flipperServer: FlipperServerImpl,
  socket: WebSocketServer,
) {
  socket.on('connection', (client, req) => {
    const clientAddress = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

    console.log(chalk.green(`Client connected ${clientAddress}`));

    let connected = true;

    function onServerEvent(event: string, payload: any) {
      const message = {
        event: 'server-event',
        payload: {
          event,
          data: payload,
        },
      } as ServerEventWebSocketMessage;
      client.send(JSON.stringify(message));
    }

    flipperServer.onAny(onServerEvent);

    client.on('message', (data) => {
      const {event, payload} = JSON.parse(
        data.toString(),
      ) as ClientWebSocketMessage;

      switch (event) {
        case 'exec': {
          const {id, command, args} = payload;

          flipperServer
            .exec(command, ...args)
            .then((result: any) => {
              if (connected) {
                const response: ExecResponseWebSocketMessage = {
                  event: 'exec-response',
                  payload: {
                    id,
                    data: result,
                  },
                };

                client.send(JSON.stringify(response));
              }
            })
            .catch((error: any) => {
              if (connected) {
                // TODO: Serialize error
                // TODO: log if verbose console.warn('Failed to handle response', error);
                const responseError: ExecResponseErrorWebSocketMessage = {
                  event: 'exec-response-error',
                  payload: {
                    id,
                    data:
                      error.toString() +
                      (error.stack ? `\n${error.stack}` : ''),
                  },
                };
                client.send(JSON.stringify(responseError));
              }
            });
        }
      }
    });

    client.on('close', () => {
      console.log(chalk.red(`Client disconnected ${clientAddress}`));
      connected = false;
      flipperServer.offAny(onServerEvent);
    });

    client.on('error', (e) => {
      console.error(chalk.red(`Socket error ${clientAddress}`), e);
      connected = false;
      flipperServer.offAny(onServerEvent);
    });
  });
}
