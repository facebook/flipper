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
import WebSocket from 'ws';

import {BrowserClientConnection} from '../BrowserClientConnection';
import {getFlipperServerConfig} from '../../FlipperServerConfig';
import BrowserServerWebSocket from '../BrowserServerWebSocket';
import {createMockSEListener, WSMessageAccumulator} from './utils';

jest.mock('../../FlipperServerConfig');
(getFlipperServerConfig as jest.Mock).mockImplementation(() => ({
  validWebSocketOrigins: ['http://localhost'],
}));

describe('BrowserServerWebSocket', () => {
  let server: BrowserServerWebSocket | undefined;
  let wsClient: WebSocket | undefined;

  afterEach(async () => {
    wsClient?.close();
    wsClient = undefined;
    await server?.stop();
    server = undefined;
  });

  test('handles a modern execute message', async () => {
    const deviceId = 'yoda42';
    const device = 'yoda';
    const os: DeviceOS = 'MacOS';
    const app = 'deathstar';
    const sdkVersion = 4;

    const mockSEListener = createMockSEListener();

    server = new BrowserServerWebSocket(mockSEListener);
    const serverReceivedMessages = new WSMessageAccumulator();
    (mockSEListener.onClientMessage as jest.Mock).mockImplementation(
      (_, parsedMessage) => serverReceivedMessages.add(parsedMessage),
    );

    expect(mockSEListener.onListening).toBeCalledTimes(0);
    const port = await server.start(0);
    expect(mockSEListener.onListening).toBeCalledTimes(1);

    expect(mockSEListener.onConnectionAttempt).toBeCalledTimes(0);
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledTimes(0);
    expect(mockSEListener.onConnectionCreated).toBeCalledTimes(0);
    const clientReceivedMessages = new WSMessageAccumulator();
    wsClient = new WebSocket(
      `ws://localhost:${port}?device_id=${deviceId}&device=${device}&app=${app}&os=${os}&sdk_version=${sdkVersion}`,
      {origin: 'http://localhost'},
    );
    wsClient.onmessage = ({data}) => clientReceivedMessages.add(data);
    await new Promise<void>((resolve, reject) => {
      wsClient!.onopen = () => resolve();
      wsClient!.onerror = (e) => reject(e);
      wsClient!.onmessage = ({data}) => {
        clientReceivedMessages.add(data);
      };
    });
    expect(mockSEListener.onConnectionAttempt).toBeCalledTimes(1);
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledTimes(1);
    expect(mockSEListener.onConnectionCreated).toBeCalledTimes(1);
    const expectedClientQuery: SecureClientQuery = {
      device_id: deviceId,
      device,
      os,
      app,
      sdk_version: sdkVersion,
      medium: 'NONE',
    };
    expect(mockSEListener.onConnectionAttempt).toBeCalledWith(
      expectedClientQuery,
    );
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledWith(
      expectedClientQuery,
    );
    expect(mockSEListener.onConnectionCreated).toBeCalledWith(
      expectedClientQuery,
      expect.anything(),
    );
    const connection: BrowserClientConnection = (
      mockSEListener.onConnectionCreated as jest.Mock
    ).mock.calls[0][1];
    expect(connection).toBeInstanceOf(BrowserClientConnection);

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

  test('handles a legacy execute message', async () => {
    const deviceId = 'yoda42';
    const device = 'yoda';

    const mockSEListener = createMockSEListener();

    server = new BrowserServerWebSocket(mockSEListener);
    const serverReceivedMessages = new WSMessageAccumulator();
    (mockSEListener.onClientMessage as jest.Mock).mockImplementation(
      (_, parsedMessage) => serverReceivedMessages.add(parsedMessage),
    );

    expect(mockSEListener.onListening).toBeCalledTimes(0);
    const port = await server.start(0);
    expect(mockSEListener.onListening).toBeCalledTimes(1);

    expect(mockSEListener.onConnectionAttempt).toBeCalledTimes(0);
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledTimes(0);
    expect(mockSEListener.onConnectionCreated).toBeCalledTimes(0);
    const clientReceivedMessages = new WSMessageAccumulator();
    wsClient = new WebSocket(
      `ws://localhost:${port}?deviceId=${deviceId}&device=${device}`,
      {origin: 'http://localhost'},
    );
    wsClient.onmessage = ({data}) => clientReceivedMessages.add(data);
    await new Promise<void>((resolve, reject) => {
      wsClient!.onopen = () => resolve();
      wsClient!.onerror = (e) => reject(e);
      wsClient!.onmessage = ({data}) => {
        clientReceivedMessages.add(data);
      };
    });
    expect(mockSEListener.onConnectionAttempt).toBeCalledTimes(1);
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledTimes(1);
    expect(mockSEListener.onConnectionCreated).toBeCalledTimes(1);
    const expectedClientQuery: SecureClientQuery = {
      device_id: deviceId,
      device,
      os: 'MacOS',
      app: device,
      sdk_version: 4,
      medium: 'NONE',
    };
    expect(mockSEListener.onConnectionAttempt).toBeCalledWith(
      expectedClientQuery,
    );
    expect(mockSEListener.onSecureConnectionAttempt).toBeCalledWith(
      expectedClientQuery,
    );
    expect(mockSEListener.onConnectionCreated).toBeCalledWith(
      expectedClientQuery,
      expect.anything(),
    );
    const connection: BrowserClientConnection = (
      mockSEListener.onConnectionCreated as jest.Mock
    ).mock.calls[0][1];
    expect(connection).toBeInstanceOf(BrowserClientConnection);

    // When client connects, server requests a list of plugins and a list of background plugins
    const getPluginsMessage: GetPluginsMessage = {
      id: 0,
      method: 'getPlugins',
    };
    const actualGetPluginsResponsePromise =
      connection.sendExpectResponse(getPluginsMessage);

    // In teh legacy flow, client sends a connect message
    // Client sends a response to the server
    const connectMessage = {
      app: device,
      type: 'connect',
      plugins: ['fbrockslegacy'],
    };
    wsClient.send(JSON.stringify(connectMessage));

    // Even thoug the client did not send a response for get plugins, the servers gets this information from the connect message
    const actualGetPluginsResponse = await actualGetPluginsResponsePromise;
    const expectedGetPluginsResponse = {
      success: {
        plugins: ['fbrockslegacy'],
      },
    };
    expect(actualGetPluginsResponse).toMatchObject(expectedGetPluginsResponse);

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
    // In the legacy mode, the client is going to use the legacy format
    const legacyExecuteMessage = {
      app: device,
      payload: executeMessage,
    };
    wsClient.send(JSON.stringify(legacyExecuteMessage));
    const actualExecuteMessage = await serverReceivedMessages.newMessage;
    // Server is smart enough to handle the legacy format and normalize the message
    expect(actualExecuteMessage).toEqual(JSON.stringify(executeMessage));
    expect(mockSEListener.onClientMessage).toBeCalledTimes(1);

    expect(mockSEListener.onProcessCSR).toBeCalledTimes(0);
    expect(mockSEListener.onConnectionClosed).toBeCalledTimes(0);
    expect(mockSEListener.onError).toBeCalledTimes(0);
  });
});
