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
import {isLoggedIn} from '../fb-stubs/user';
import React from 'react';
import {Typography} from 'antd';
import {ACTIVE_SHEET_SIGN_IN, setActiveSheet} from '../reducers/application';

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
    }: {
      client: UninitializedClient;
      medium: CertificateExchangeMedium;
      deviceID: string;
    }) => {
      store.dispatch(
        addErrorNotification(
          `Timed out establishing connection with "${client.appName}" on "${client.deviceName}".`,
          medium === 'WWW' ? (
            <>
              Verify that both your computer and mobile device are on
              Lighthouse/VPN{' '}
              {!isLoggedIn().get() && (
                <>
                  and{' '}
                  <Typography.Link
                    onClick={() =>
                      store.dispatch(setActiveSheet(ACTIVE_SHEET_SIGN_IN))
                    }>
                    log in to Facebook Intern
                  </Typography.Link>
                </>
              )}{' '}
              so they can exchange certificates.{' '}
              <Typography.Link href="https://www.internalfb.com/intern/wiki/Ops/Network/Enterprise_Network_Engineering/ene_wlra/VPN_Help/Vpn/mobile/">
                Check this link
              </Typography.Link>{' '}
              on how to enable VPN on mobile device.
            </>
          ) : (
            'Verify that your client is connected to Flipper and that there is no error related to idb.'
          ),
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
    store.dispatch(selectDevice(device));
    store.dispatch(selectClient(client.id));
  }
}
