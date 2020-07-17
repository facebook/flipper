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
import FlipperSelfInspectionDevice from '../../devices/FlipperSelfInspectionDevice';
import {Store} from '../../reducers';
import {Logger} from '../../fb-interfaces/Logger';

import Server from '../../server';
import {buildClientId} from '../clientUtils';
import {selfInspectionClient} from './selfInspectionClient';
import {flipperMessagesClientPlugin} from './plugins/FlipperMessagesClientPlugin';

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
  const device_id = 'FlipperSelfInspectionDevice';
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: new FlipperSelfInspectionDevice(
      device_id,
      'emulator',
      appName,
      'JSWebApp',
    ),
  });

  selfInspectionClient.addPlugin(flipperMessagesClientPlugin);

  const query: ClientQuery = {
    app: appName,
    os: 'JSWebApp',
    device: 'emulator',
    device_id,
    sdk_version: 4,
  };
  const clientId = buildClientId(query);

  const client = new Client(
    clientId,
    query,
    selfInspectionClient,
    logger,
    store,
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
        const toUnregister = new Set<string>();
        store.dispatch({
          type: 'UNREGISTER_DEVICES',
          payload: toUnregister,
        });
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
