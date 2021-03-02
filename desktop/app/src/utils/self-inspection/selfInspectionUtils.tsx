/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Client, {ClientQuery} from '../../Client';
import {FlipperClientConnection} from '../../Client';
import {Store} from '../../reducers';
import {Logger} from '../../fb-interfaces/Logger';

import Server from '../../server';
import {buildClientId} from '../clientUtils';
import {selfInspectionClient} from './selfInspectionClient';
import {flipperMessagesClientPlugin} from './plugins/FlipperMessagesClientPlugin';
import {destroyDevice} from '../../reducers/connections';

export function initSelfInpector(
  store: Store,
  logger: Logger,
  flipperServer: Server,
  flipperConnections: Map<
    string,
    {
      connection: FlipperClientConnection<any, any> | null | undefined;
      client: Client;
    }
  >,
) {
  const appName = 'Flipper';

  selfInspectionClient.addPlugin(flipperMessagesClientPlugin);
  const hostDevice = store
    .getState()
    .connections.devices.find((d) => d.serial === '');
  if (!hostDevice) {
    console.error('Failed to find host device for self inspector');
    return;
  }

  const query: ClientQuery = {
    app: appName,
    os: 'MacOS',
    device: 'emulator',
    device_id: '',
    sdk_version: 4,
  };
  const clientId = buildClientId(query);

  const client = new Client(
    clientId,
    query,
    selfInspectionClient,
    logger,
    store,
    undefined,
    hostDevice,
  );

  flipperConnections.set(clientId, {
    connection: selfInspectionClient,
    client: client,
  });

  selfInspectionClient.connectionStatus().subscribe({
    onNext(payload) {
      if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
        console.debug(`Device disconnected ${client.id}`, 'server');
        flipperServer.removeConnection(client.id);
        destroyDevice(store, logger, client.id);
      }
    },
    onSubscribe(subscription) {
      subscription.request(Number.MAX_SAFE_INTEGER);
    },
  });

  client.init().then(() => {
    flipperServer.emit('new-client', client);
    flipperServer.emit('clients-change');
    client.emit('plugins-change');

    selfInspectionClient.subscibeForClientMessages((payload: any) => {
      // let's break the possible recursion problems here
      // for example we want to send init plugin message, but store state is being updated when we enable plugins
      setImmediate(() => {
        client.onMessage(JSON.stringify(payload));
      });
    });
  });
}
