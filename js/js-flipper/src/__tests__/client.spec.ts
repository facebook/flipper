/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {AddressInfo} from 'net';
import {WebSocketServer, WebSocket} from 'ws';

import {FlipperClient, FlipperWebSocket} from '../client';
import {RECONNECT_TIMEOUT} from '../consts';
import {WSMessageAccumulator} from './utils';

// Jest fake timer doesn't play well with process.nextTick.
// "ws" since version 8.6.0 uses process.nextTick for emitting "abortHandshake" event:
// https://github.com/websockets/ws/commit/d086f4bcbbe235f12f6fa2ddba5a8ce1342dac58.
// Because of that, "error" event is never emitted on websocket client when fake timer is used.
// To fix that we switched to "sinon" fake timer instead of jest.
// Sinon work just fine in this case.
import sinon from 'sinon';

describe('client', () => {
  let port: number;
  let wsServer: WebSocketServer;
  let client: FlipperClient;
  let urlBase: string;
  let clock: sinon.SinonFakeTimers;
  // TODO: Figure out why we need to convert ot unknown first
  const websocketFactory = (url: string) =>
    new WebSocket(url) as unknown as FlipperWebSocket;

  let allowConnection = true;
  const verifyClient = jest.fn().mockImplementation(() => allowConnection);
  beforeEach(() => {
    allowConnection = true;
  });

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });
  afterAll(() => {
    clock.restore();
  });

  beforeEach(async () => {
    wsServer = new WebSocketServer({
      port: 0,
      verifyClient,
    });
    await new Promise((resolve) => wsServer.on('listening', resolve));
    port = (wsServer.address() as AddressInfo).port;
    client = new FlipperClient();
    urlBase = `localhost:${port}`;
  });
  afterEach(async () => {
    client.stop();
    await new Promise((resolve) => wsServer.close(resolve));
  });

  describe('message handling', () => {
    describe('getPlugins', () => {
      it('returns a list of registered plugins', async () => {
        const serverReceivedMessages = new WSMessageAccumulator();
        wsServer.on('connection', (ws) => {
          ws.send(JSON.stringify({method: 'getPlugins', id: 0}));
          ws.on('message', (message) =>
            serverReceivedMessages.add(message.toString()),
          );
        });

        client.addPlugin({
          getId: () => '42',
          onConnect: () => undefined,
          onDisconnect: () => undefined,
        });

        await client.start('universe', {urlBase, websocketFactory});

        const expectedGetPluginsResponse = {
          id: 0,
          success: {
            plugins: ['42'],
          },
        };
        const actualGetPluginsReponse = await serverReceivedMessages.newMessage;
        expect(actualGetPluginsReponse).toBe(
          JSON.stringify(expectedGetPluginsResponse),
        );
      });
    });

    it('onError is called if message handling has failed, connection is closed, client reconnects', async () => {
      const onError = jest.fn();

      let resolveFirstConnectionPromise: () => void;
      const firstConnectionPromise = new Promise<void>((resolve) => {
        resolveFirstConnectionPromise = resolve;
      });
      wsServer.on('connection', (ws) => {
        resolveFirstConnectionPromise();
        // Send a malformed message to cause a failure
        ws.send('{{{');
      });

      // Capturing a moment when the client received an error
      const receivedErrorPromise = new Promise<void>((resolve) =>
        onError.mockImplementationOnce(() => {
          resolve();
        }),
      );

      await client.start('universe', {urlBase, websocketFactory, onError});

      // Capturing a moment when the client was closed because of the error
      const closedPromise = new Promise<void>((resolve) => {
        const originalOnclose = (client as any).ws.onclose;
        (client as any).ws.onclose = (data: unknown) => {
          originalOnclose(data);
          resolve();
        };
      });

      await receivedErrorPromise;
      expect(onError).toBeCalledTimes(1);

      // Make sure that the connection went through
      await firstConnectionPromise;

      wsServer.removeAllListeners('connection');

      let resolveSecondConnectionPromise: () => void;
      const secondConnectionPromise = new Promise<void>((resolve) => {
        resolveSecondConnectionPromise = resolve;
      });
      wsServer.on('connection', () => {
        resolveSecondConnectionPromise();
      });

      // Make sure the current client is closed
      // When it closes, it schedules a reconnection
      await closedPromise;

      // Now, once the reconnection is scheduled, we can advance timers to do the actual reconnection
      clock.tick(RECONNECT_TIMEOUT);

      // Make sure that the client reconnects
      await secondConnectionPromise;
    });
  });

  describe('connection', () => {
    it('onError is called if connection has failed, it is called every time Flipper fails to reconnect', async () => {
      allowConnection = false;

      const onError = jest.fn();

      expect(onError).toBeCalledTimes(0);
      client.start('universe', {urlBase, websocketFactory, onError});

      // Expect connection request to fail
      await new Promise((resolve) => onError.mockImplementationOnce(resolve));
      expect(onError).toBeCalledTimes(1);
      // Checking that the request went through to the server
      expect(verifyClient).toBeCalledTimes(1);

      // Exepect reconnection attempts to fail
      for (let i = 2; i < 10; i++) {
        clock.tick(RECONNECT_TIMEOUT);
        await new Promise((resolve) => onError.mockImplementationOnce(resolve));
        expect(onError).toBeCalledTimes(i);
        expect(verifyClient).toBeCalledTimes(i);
      }
    });
  });
});
