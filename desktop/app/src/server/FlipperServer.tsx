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
import {UninitializedClient} from './UninitializedClient';
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
import {IOSDeviceManager} from './devices/ios/iOSDeviceManager';
import metroDevice from './devices/metro/metroDeviceManager';
import desktopDevice from './devices/desktop/desktopDeviceManager';
import BaseDevice from './devices/BaseDevice';

type FlipperServerEvents = {
  'server-state': {state: ServerState; error?: Error};
  'server-error': any;
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
  enableIOS: boolean;
  idbPath: string;
  enablePhysicalIOS: boolean;
  serverPorts: ServerPorts;
}

type ServerState = 'pending' | 'starting' | 'started' | 'error' | 'closed';

// defaultConfig should be used for testing only, and disables by default all features
const defaultConfig: FlipperServerConfig = {
  androidHome: '',
  enableAndroid: false,
  enableIOS: false,
  enablePhysicalIOS: false,
  idbPath: '',
  serverPorts: {
    insecure: -1,
    secure: -1,
  },
};

/**
 * FlipperServer takes care of all incoming device & client connections.
 * It will set up managers per device type, and create the incoming
 * RSocket/WebSocket server to handle incoming client connections.
 *
 * The server should be largely treated as event emitter, by listening to the relevant events
 * using '.on'. All events are strongly typed.
 */
export class FlipperServer {
  public config: FlipperServerConfig;

  private readonly events = new EventEmitter();
  // server handles the incoming RSocket / WebSocket connections from Flipper clients
  readonly server: ServerController;
  readonly disposers: ((() => void) | void)[] = [];
  private readonly devices = new Map<string, BaseDevice>();
  state: ServerState = 'pending';
  android: AndroidDeviceManager;
  ios: IOSDeviceManager;

  // TODO: remove store argument
  constructor(
    config: Partial<FlipperServerConfig>,
    /** @deprecated remove! */
    public store: Store,
    public logger: Logger,
  ) {
    this.config = {...defaultConfig, ...config};
    const server = (this.server = new ServerController(this));
    this.android = new AndroidDeviceManager(this);
    this.ios = new IOSDeviceManager(this);

    server.addListener('new-client', (client: Client) => {
      this.emit('client-connected', client);
    });

    server.addListener('error', (err) => {
      this.emit('server-error', err);
    });

    server.addListener('start-client-setup', (client: UninitializedClient) => {
      this.store.dispatch({
        type: 'START_CLIENT_SETUP',
        payload: client,
      });
    });

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
  }

  setServerState(state: ServerState, error?: Error) {
    this.state = state;
    this.emit('server-state', {state, error});
  }

  /**
   * Starts listening to parts and watching for devices
   */
  async start() {
    if (this.state !== 'pending') {
      throw new Error('Server already started');
    }
    this.setServerState('starting');

    try {
      await this.server.init();
      await this.startDeviceListeners();
      this.setServerState('started');
    } catch (e) {
      console.error('Failed to start FlipperServer', e);
      this.setServerState('error', e);
    }
  }

  async startDeviceListeners() {
    this.disposers.push(
      await this.android.watchAndroidDevices(),
      await this.ios.watchIOSDevices(),
      metroDevice(this),
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

  registerDevice(device: BaseDevice) {
    // destroy existing device
    const existing = this.devices.get(device.serial);
    if (existing) {
      // assert different kind of devices aren't accidentally reusing the same serial
      if (Object.getPrototypeOf(existing) !== Object.getPrototypeOf(device)) {
        throw new Error(
          `Tried to register a new device type for existing serial '${
            device.serial
          }': Trying to replace existing '${
            Object.getPrototypeOf(existing).constructor.name
          }' with a new '${Object.getPrototypeOf(device).constructor.name}`,
        );
      }
      // devices should be recycled, unless they have lost connection
      if (existing.connected.get()) {
        throw new Error(
          `Tried to replace still connected device '${device.serial}' with a new instance`,
        );
      }
      existing.destroy();
    }
    // register new device
    this.devices.set(device.serial, device);
    this.emit('device-connected', device);
  }

  unregisterDevice(serial: string) {
    const device = this.devices.get(serial);
    if (!device) {
      return;
    }
    device.disconnect(); // we'll only destroy upon replacement
    this.emit('device-disconnected', device);
  }

  getDevice(serial: string): BaseDevice {
    const device = this.devices.get(serial);
    if (!device) {
      throw new Error('No device with serial: ' + serial);
    }
    return device;
  }

  getDeviceSerials(): string[] {
    return Array.from(this.devices.keys());
  }

  getDevices(): BaseDevice[] {
    return Array.from(this.devices.values());
  }

  public async close() {
    this.server.close();
    for (const device of this.devices.values()) {
      device.destroy();
    }
    this.disposers.forEach((f) => f?.());
    this.setServerState('closed');
  }
}
