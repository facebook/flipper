/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Server from '../server';

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import Client from '../Client';
import {UninitializedClient} from '../UninitializedClient';
import {addErrorNotification} from '../reducers/notifications';
import {CertificateExchangeMedium} from '../utils/CertificateProvider';
import {selectClient, selectDevice} from '../reducers/connections';

export default (store: Store, logger: Logger) => {
  const server = new Server(logger, store);
  server.init();

  server.addListener('new-client', (client: Client) => {
    registerNewClient(store, client);
  });

  server.addListener('error', (err) => {
    store.dispatch(
      addErrorNotification(
        'Failed to start websocket server',
        err.code === 'EADDRINUSE'
          ? "Couldn't start websocket server. Looks like you have multiple copies of Flipper running."
          : err.message || 'Unknown error',
      ),
    );
  });

  server.addListener('start-client-setup', (client: UninitializedClient) => {
    store.dispatch({
      type: 'START_CLIENT_SETUP',
      payload: client,
    });
  });

  server.addListener(
    'finish-client-setup',
    (payload: {client: UninitializedClient; deviceId: string}) => {
      store.dispatch({
        type: 'FINISH_CLIENT_SETUP',
        payload: payload,
      });
    },
  );

  server.addListener(
    'client-setup-error',
    ({client, error}: {client: UninitializedClient; error: Error}) => {
      store.dispatch(
        addErrorNotification(
          `Connection to '${client.appName}' on '${client.deviceName}' failed`,
          'Failed to start client connection',
          error,
        ),
      );
    },
  );

  server.addListener(
    'client-unresponsive-error',
    ({
      client,
      medium,
      deviceID,
    }: {
      client: UninitializedClient;
      medium: CertificateExchangeMedium;
      deviceID: string;
    }) => {
      store.dispatch(
        addErrorNotification(
          `Client ${client.appName} with device ${deviceID} took long time to connect back on the trusted channel.`,
          medium === 'WWW'
            ? 'Verify that you are on lighthouse on your client and have a working internet connection. To connect to lighthouse on your client, use VPN. Follow this link: https://www.internalfb.com/intern/wiki/Ops/Network/Enterprise_Network_Engineering/ene_wlra/VPN_Help/Vpn/mobile/'
            : 'Verify if your client is connected to Flipper and verify if there is no error related to idb.',
        ),
      );
    },
  );

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      server.close();
    });
  }
  return server.close;
};

export function registerNewClient(store: Store, client: Client) {
  const {connections} = store.getState();
  const existingClient = connections.clients.find((c) => c.id === client.id);

  if (existingClient) {
    existingClient.destroy();
    store.dispatch({
      type: 'CLEAR_CLIENT_PLUGINS_STATE',
      payload: {
        clientId: client.id,
        devicePlugins: new Set(),
      },
    });
    store.dispatch({
      type: 'CLIENT_REMOVED',
      payload: client.id,
    });
  }

  store.dispatch({
    type: 'NEW_CLIENT',
    payload: client,
  });

  const device = client.deviceSync;
  if (device) {
    const selectedDevice = connections.selectedDevice;
    const selectedClient = connections.clients.find(
      (c) => c.id === connections.selectedApp,
    );
    if (
      // If this condition meets, it means that the previous app wasn't selected explicitly by the user
      connections.selectedApp !== connections.userPreferredApp ||
      !selectedClient ||
      !selectedDevice
    ) {
      store.dispatch(selectDevice(device));
      store.dispatch(selectClient(client.id));
    }
  }
}
