/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ClientWebSocketMessage,
  ExecResponseWebSocketMessage,
  ExecResponseErrorWebSocketMessage,
  ServerEventWebSocketMessage,
  GenericWebSocketError,
  UserError,
  SystemError,
  getLogger,
  CompanionEventWebSocketMessage,
} from 'flipper-common';
import {FlipperServerImpl} from '../FlipperServerImpl';
import {RawData, WebSocketServer} from 'ws';
import {
  FlipperServerCompanion,
  FlipperServerCompanionEnv,
} from 'flipper-server-companion';
import {URLSearchParams} from 'url';
import {tracker} from '../tracker';
import {performance} from 'perf_hooks';

const safe = (f: () => void) => {
  try {
    f();
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.name, error.stack);
    }
  }
};

/* eslint-disable @typescript-eslint/no-unused-vars */
let numberOfConnectedClients = 0;

/**
 * Attach and handle incoming messages from clients.
 * @param server A FlipperServer instance.
 * @param socket A ws socket on which to listen for events.
 */
export function attachSocketServer(
  socket: WebSocketServer,
  server: FlipperServerImpl,
  companionEnv: FlipperServerCompanionEnv,
) {
  const t0 = performance.now();
  const browserConnectionTimeout = setTimeout(() => {
    tracker.track('browser-connection-created', {
      successful: false,
      timeMS: performance.now() - t0,
    });
  }, 20000);

  socket.on('connection', (client, req) => {
    const clientAddress =
      (req.socket.remoteAddress &&
        ` ${req.socket.remoteAddress}:${req.socket.remotePort}`) ||
      '';

    console.log('Client connected', clientAddress);
    numberOfConnectedClients++;

    clearTimeout(browserConnectionTimeout);
    tracker.track('browser-connection-created', {
      successful: true,
      timeMS: performance.now() - t0,
    });

    let connected = true;

    let flipperServerCompanion: FlipperServerCompanion | undefined;
    if (req.url) {
      const params = new URLSearchParams(req.url.slice(1));

      if (params.get('server_companion')) {
        flipperServerCompanion = new FlipperServerCompanion(
          server,
          getLogger(),
          companionEnv,
        );
      }
    }

    async function onServerEvent(event: string, payload: any) {
      if (flipperServerCompanion) {
        switch (event) {
          case 'client-message': {
            const client = flipperServerCompanion.getClient(payload.id);
            if (!client) {
              console.warn(
                'flipperServerCompanion.handleClientMessage -> unknown client',
                event,
                payload,
              );
              return;
            }
            client.onMessage(payload.message);
            return;
          }
          case 'client-disconnected': {
            if (flipperServerCompanion.getClient(payload.id)) {
              flipperServerCompanion.destroyClient(payload.id);
            }
            // We use "break" here instead of "return" because a flipper desktop client still might be interested in the "client-disconnect" event to update its list of active clients
            break;
          }
          case 'device-disconnected': {
            if (flipperServerCompanion.getDevice(payload.id)) {
              flipperServerCompanion.destroyDevice(payload.id);
            }
            // We use "break" here instead of "return" because a flipper desktop client still might be interested in the "device-disconnect" event to update its list of active devices
            break;
          }
        }
      }

      const message = {
        event: 'server-event',
        payload: {
          event,
          data: payload,
        },
      } as ServerEventWebSocketMessage;
      client.send(JSON.stringify(message));
    }

    server.onAny(onServerEvent);

    async function onServerCompanionEvent(event: string, payload: any) {
      const message = {
        event: 'companion-event',
        payload: {
          event,
          data: payload,
        },
      } as CompanionEventWebSocketMessage;
      client.send(JSON.stringify(message));
    }

    flipperServerCompanion?.onAny(onServerCompanionEvent);

    async function onClientMessage(data: RawData) {
      let [event, payload]: [event: string | null, payload: any | null] = [
        null,
        null,
      ];
      try {
        ({event, payload} = JSON.parse(
          data.toString(),
        ) as ClientWebSocketMessage);
      } catch (err) {
        console.warn('flipperServer -> onMessage: failed to parse JSON', err);
        const response: GenericWebSocketError = {
          event: 'error',
          payload: {message: `Failed to parse JSON request: ${err}`},
        };
        client.send(JSON.stringify(response));
        return;
      }

      switch (event) {
        case 'exec': {
          const {id, command, args} = payload;

          if (typeof args[Symbol.iterator] !== 'function') {
            console.warn(
              'flipperServer -> exec: args argument in payload is not iterable',
            );
            const responseError: ExecResponseErrorWebSocketMessage = {
              event: 'exec-response-error',
              payload: {
                id,
                data: 'Payload args argument is not an iterable.',
              },
            };
            client.send(JSON.stringify(responseError));
            return;
          }

          const execRes = flipperServerCompanion?.canHandleCommand(command)
            ? flipperServerCompanion.exec(command, ...args)
            : server.exec(command, ...args);

          execRes
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
              if (error instanceof UserError) {
                console.warn(
                  `flipper-server.startSocketServer.exec: ${error.message}`,
                  error.context,
                  error.stack,
                );
              }
              if (error instanceof SystemError) {
                console.error(
                  `flipper-server.startSocketServer.exec: ${error.message}`,
                  error.context,
                  error.stack,
                );
              }
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
    }

    client.on('message', (data) => {
      safe(() => onClientMessage(data));
    });

    async function onClientClose(code?: number, error?: string) {
      console.log(`Client disconnected ${clientAddress}`);

      numberOfConnectedClients--;

      connected = false;
      server.offAny(onServerEvent);
      flipperServerCompanion?.destroyAll();

      tracker.track('server-client-close', {
        code,
        error,
      });
    }

    client.on('close', (code, _reason) => {
      console.info('[flipper-server] Client close with code', code);
      safe(() => onClientClose(code));
    });

    client.on('error', (error) => {
      safe(() => {
        /**
         * The socket will close due to an error. In this case,
         * do not close on idle as there's a high probability the
         * client will attempt to connect again.
         */
        onClientClose(undefined, error.message);
        console.error('Client disconnected with error', error);
      });
    });
  });
}
