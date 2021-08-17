/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'events';
import Client from '../Client';
import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import ServerController from './comms/ServerController';
import {UninitializedClient} from '../UninitializedClient';
import {addErrorNotification} from '../reducers/notifications';
import {CertificateExchangeMedium} from '../server/utils/CertificateProvider';
import {isLoggedIn} from '../fb-stubs/user';
import React from 'react';
import {Typography} from 'antd';
import {
  ACTIVE_SHEET_SIGN_IN,
  ServerPorts,
  setActiveSheet,
} from '../reducers/application';
import {AndroidDeviceManager} from './devices/android/androidDeviceManager';
import iOSDevice from './devices/ios/iOSDeviceManager';
import metroDevice from './devices/metro/metroDeviceManager';
import desktopDevice from './devices/desktop/desktopDeviceManager';
import BaseDevice from './devices/BaseDevice';

type FlipperServerEvents = {
  'server-start-error': any;
  notification: {
    type: 'error';
    title: string;
    description: string;
  };
  'device-connected': BaseDevice;
  'device-disconnected': BaseDevice;
  'client-connected': Client;
};

export interface FlipperServerConfig {
  enableAndroid: boolean;
  androidHome: string;
  serverPorts: ServerPorts;
}

export async function startFlipperServer(
  config: FlipperServerConfig,
  store: Store,
  logger: Logger,
): Promise<FlipperServer> {
  const server = new FlipperServer(config, store, logger);

  await server.start();
  return server;
}

/**
 * FlipperServer takes care of all incoming device & client connections.
 * It will set up managers per device type, and create the incoming
 * RSocket/WebSocket server to handle incoming client connections.
 *
 * The server should be largely treated as event emitter, by listening to the relevant events
 * using '.on'. All events are strongly typed.
 */
export class FlipperServer {
  private readonly events = new EventEmitter();
  readonly server: ServerController;
  readonly disposers: ((() => void) | void)[] = [];

  android: AndroidDeviceManager;

  // TODO: remove store argument
  constructor(
    public config: FlipperServerConfig,
    /** @deprecated remove! */
    public store: Store,
    public logger: Logger,
  ) {
    this.server = new ServerController(logger, store);
    this.android = new AndroidDeviceManager(this);
  }

  /** @private */
  async start() {
    const server = this.server;

    server.addListener('new-client', (client: Client) => {
      this.emit('client-connected', client);
    });

    server.addListener('error', (err) => {
      this.emit('server-start-error', err);
    });

    server.addListener('start-client-setup', (client: UninitializedClient) => {
      this.store.dispatch({
        type: 'START_CLIENT_SETUP',
        payload: client,
      });
    });

    server.addListener(
      'finish-client-setup',
      (payload: {client: UninitializedClient; deviceId: string}) => {
        this.store.dispatch({
          type: 'FINISH_CLIENT_SETUP',
          payload: payload,
        });
      },
    );

    server.addListener(
      'client-setup-error',
      ({client, error}: {client: UninitializedClient; error: Error}) => {
        this.store.dispatch(
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
        this.store.dispatch(
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
                        this.store.dispatch(
                          setActiveSheet(ACTIVE_SHEET_SIGN_IN),
                        )
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

    await server.init();
    await this.startDeviceListeners();
  }

  async startDeviceListeners() {
    this.disposers.push(
      await this.android.watchAndroidDevices(),
      iOSDevice(this.store, this.logger),
      metroDevice(this.store, this.logger),
      desktopDevice(this),
    );
  }

  on<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void {
    this.events.on(event, callback);
  }

  /**
   * @internal
   */
  emit<Event extends keyof FlipperServerEvents>(
    event: Event,
    payload: FlipperServerEvents[Event],
  ): void {
    this.events.emit(event, payload);
  }

  public async close() {
    this.server.close();
    this.disposers.forEach((f) => f?.());
  }
}
