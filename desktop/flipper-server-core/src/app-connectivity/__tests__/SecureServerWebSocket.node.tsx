/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DeviceOS,
  ExecuteMessage,
  GetPluginsMessage,
  ResponseMessage,
  SecureClientQuery,
} from 'flipper-common';
import {toBase64} from 'js-base64';
import WebSocket from 'ws';

import SecureServerWebSocket from '../SecureServerWebSocket';
import {transformCertificateExchangeMediumToType} from '../Utilities';
import WebSocketClientConnection from '../WebSocketClientConnection';
import {createMockSEListener, WSMessageAccumulator} from './utils';

describe('SecureServerWebSocket', () => {
  let server: SecureServerWebSocket | undefined;
  let wsClient: WebSocket | undefined;

  afterEach(async () => {
    wsClient?.close();
    wsClient = undefined;
    await server?.stop();
    server = undefined;
  });

  test('handles an execute message', async () => {
    const deviceId = 'yoda42';
    const device = 'yoda';
    const os: DeviceOS = 'MacOS';
    const app = 'deathstar';
    const sdkVersion = 4;
    const medium = 2;
    const csr = 'luke';
    const csrPath = 'notearth';

    const mockSEListener = createMockSEListener();

    server = new SecureServerWebSocket(mockSEListener);
    const serverReceivedMessages = new WSMessageAccumulator();
    (mockSEListener.onClientMessage as jest.Mock).mockImplementation(
      (_, parsedMessage) => serverReceivedMessages.add(parsedMessage),
    );

    expect(mockSEListener.onListening).toBeCalledTimes(0);
    const port = await server.start(0);
    expect(mockSEListener.onListening).toBeCalledTimes(1);

    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledTimes(0);
    expect(mockSEListener.onConnectionCreated).toBeCalledTimes(0);
    const clientReceivedMessages = new WSMessageAccumulator();
    wsClient = new WebSocket(
      `ws://localhost:${port}?device_id=${deviceId}&device=${device}&app=${app}&os=${os}&sdk_version=${sdkVersion}&csr=${toBase64(
        csr,
      )}&csr_path=${csrPath}&medium=${medium}`,
    );
    wsClient.onmessage = ({data}) => clientReceivedMessages.add(data);
    await new Promise<void>((resolve, reject) => {
      wsClient!.onopen = () => resolve();
      wsClient!.onerror = (e) => reject(e);
      wsClient!.onmessage = ({data}) => {
        clientReceivedMessages.add(data);
      };
    });
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledTimes(1);
    expect(mockSEListener.onConnectionCreated).toBeCalledTimes(1);
    const expectedClientQuery: SecureClientQuery = {
      device_id: deviceId,
      device,
      os,
      app,
      sdk_version: sdkVersion,
      csr,
      csr_path: csrPath,
      medium: transformCertificateExchangeMediumToType(medium),
    };
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledWith(
      expectedClientQuery,
    );
    expect(mockSEListener.onConnectionCreated).toBeCalledWith(
      expectedClientQuery,
      expect.anything(),
    );
    const connection: WebSocketClientConnection = (
      mockSEListener.onConnectionCreated as jest.Mock
    ).mock.calls[0][1];
    expect(connection).toBeInstanceOf(WebSocketClientConnection);

    // When client connects, server requests a list of plugins and a list of background plugins
    const getPluginsMessage: GetPluginsMessage = {
      id: 0,
      method: 'getPlugins',
    };
    const actualGetPluginsResponsePromise =
      connection.sendExpectResponse(getPluginsMessage);

    const actualGetPluginsMessage = await clientReceivedMessages.newMessage;
    expect(actualGetPluginsMessage).toBe(JSON.stringify(getPluginsMessage));

    // Client sends a response to the server
    const getPluginsResponse: ResponseMessage = {
      id: 0,
      success: {
        plugins: ['fbrocks'],
      },
    };
    wsClient.send(JSON.stringify(getPluginsResponse));

    // Server receives the response
    const actualGetPluginsResponse = await actualGetPluginsResponsePromise;
    expect(actualGetPluginsResponse).toMatchObject(getPluginsResponse);

    // Now client can send an execute message
    // Note: In real world, the server should have sent a getBackgroundPluginsRequest as well
    const executeMessage: ExecuteMessage = {
      method: 'execute',
      params: {
        method: 'admire',
        api: 'flipper',
        params: 'constantly',
      },
    };
    wsClient.send(JSON.stringify(executeMessage));
    const actualExecuteMessage = await serverReceivedMessages.newMessage;
    expect(actualExecuteMessage).toEqual(JSON.stringify(executeMessage));
    expect(mockSEListener.onClientMessage).toBeCalledTimes(1);

    expect(mockSEListener.onProcessCSR).toBeCalledTimes(0);
    expect(mockSEListener.onConnectionClosed).toBeCalledTimes(0);
    expect(mockSEListener.onError).toBeCalledTimes(0);
  });
});
