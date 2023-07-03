/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientQuery, DeviceOS, SignCertificateMessage} from 'flipper-common';
import WebSocket from 'ws';

import ServerWebSocket from '../ServerWebSocket';
import {
  createMockSEListener,
  WSMessageAccumulator,
  processCSRResponse,
} from './utils';

describe('ServerWebSocket', () => {
  let server: ServerWebSocket | undefined;
  let wsClient: WebSocket | undefined;

  afterEach(async () => {
    wsClient?.close();
    wsClient = undefined;
    await server?.stop();
    server = undefined;
  });

  const deviceId = 'yoda42';
  const device = 'yoda';
  const os: DeviceOS = 'MacOS';
  const app = 'deathstar';
  const sdkVersion = 4;

  test('accepts new connections and handles a signCertificate message', async () => {
    const mockSEListener = createMockSEListener();

    server = new ServerWebSocket(mockSEListener);

    expect(mockSEListener.onListening).toBeCalledTimes(0);
    const port = await server.start(0);
    expect(mockSEListener.onListening).toBeCalledTimes(1);

    expect(mockSEListener.onConnectionAttempt).toBeCalledTimes(0);
    wsClient = new WebSocket(
      `ws://localhost:${port}?device_id=${deviceId}&device=${device}&app=${app}&os=${os}&sdk_version=${sdkVersion}&medium=2`,
    );
    const receivedMessages = new WSMessageAccumulator();
    await new Promise<void>((resolve, reject) => {
      wsClient!.onopen = () => resolve();
      wsClient!.onerror = (e) => reject(e);
      wsClient!.onmessage = ({data}) => receivedMessages.add(data);
    });
    expect(mockSEListener.onConnectionAttempt).toBeCalledTimes(1);
    const expectedClientQuery: ClientQuery = {
      device_id: deviceId,
      device,
      os,
      app,
      sdk_version: sdkVersion,
      medium: 'WWW',
    };
    expect(mockSEListener.onConnectionAttempt).toBeCalledWith(
      expectedClientQuery,
    );

    expect(mockSEListener.onProcessCSR).toBeCalledTimes(0);
    const signCertMessage: SignCertificateMessage = {
      method: 'signCertificate',
      csr: 'ilovepancakes',
      destination: 'mars',
      medium: 2,
    };
    wsClient.send(JSON.stringify(signCertMessage));
    const response = await receivedMessages.newMessage;
    expect(response).toBe(JSON.stringify(processCSRResponse));
    expect(mockSEListener.onProcessCSR).toBeCalledTimes(1);

    expect(mockSEListener.onConnectionCreated).toBeCalledTimes(0);
    expect(mockSEListener.onConnectionClosed).toBeCalledTimes(0);
    expect(mockSEListener.onError).toBeCalledTimes(0);
    expect(mockSEListener.onClientMessage).toBeCalledTimes(0);
  });

  test('throws if starts on the same port', async () => {
    const mockSEListener = createMockSEListener();
    server = new ServerWebSocket(mockSEListener);
    const assignedPort = await server.start(0);

    expect(mockSEListener.onListening).toBeCalledTimes(1);
    expect(mockSEListener.onError).toBeCalledTimes(0);

    const conflictingServer = new ServerWebSocket(mockSEListener);
    await expect(conflictingServer.start(assignedPort)).rejects.toThrow(
      /EADDRINUSE/,
    );

    expect(mockSEListener.onListening).toBeCalledTimes(1);
    expect(mockSEListener.onError).toBeCalledTimes(0); // no onError triggered, as start throws already
  });

  test('does NOT call listener onError if individual message handling fails', async () => {
    const mockSEListener = createMockSEListener();

    server = new ServerWebSocket(mockSEListener);
    const port = await server.start(0);

    wsClient = new WebSocket(
      `ws://localhost:${port}?device_id=${deviceId}&device=${device}&app=${app}&os=${os}&sdk_version=${sdkVersion}`,
    );
    await new Promise<void>((resolve) => {
      wsClient!.onopen = () => resolve();
    });

    expect(mockSEListener.onError).toBeCalledTimes(0);
    // Sending invalid JSON to cause a parsing error
    wsClient.send(`{{{{`);
    // Server must close the connection on error

    expect(mockSEListener.onError).toBeCalledTimes(0);
    expect(mockSEListener.onListening).toBeCalledTimes(1);
  });
});
