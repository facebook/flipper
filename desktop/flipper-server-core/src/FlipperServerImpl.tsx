/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'events';
import {Logger} from 'flipper-common';
import ServerController from './comms/ServerController';
import {CertificateExchangeMedium} from './utils/CertificateProvider';
import {AndroidDeviceManager} from './devices/android/androidDeviceManager';
import {
  IOSDeviceManager,
  launchSimulator,
} from './devices/ios/iOSDeviceManager';
import metroDevice from './devices/metro/metroDeviceManager';
import desktopDevice from './devices/desktop/desktopDeviceManager';
import {
  FlipperServerEvents,
  FlipperServerState,
  FlipperServerCommands,
  FlipperServer,
  UninitializedClient,
} from 'flipper-common';
import {ServerDevice} from './devices/ServerDevice';
import {Base64} from 'js-base64';
import MetroDevice from './devices/metro/MetroDevice';
import {launchEmulator} from './devices/android/AndroidDevice';
import {
  FlipperServerConfig,
  setFlipperServerConfig,
} from './FlipperServerConfig';

/**
 * FlipperServer takes care of all incoming device & client connections.
 * It will set up managers per device type, and create the incoming
 * RSocket/WebSocket server to handle incoming client connections.
 *
 * The server should be largely treated as event emitter, by listening to the relevant events
 * using '.on'. All events are strongly typed.
 */
export class FlipperServerImpl implements FlipperServer {
  private readonly events = new EventEmitter();
  // server handles the incoming RSocket / WebSocket connections from Flipper clients
  readonly server: ServerController;
  readonly disposers: ((() => void) | void)[] = [];
  private readonly devices = new Map<string, ServerDevice>();
  state: FlipperServerState = 'pending';
  android: AndroidDeviceManager;
  ios: IOSDeviceManager;

  constructor(config: FlipperServerConfig, public logger: Logger) {
    setFlipperServerConfig(config);
    const server = (this.server = new ServerController(this));
    this.android = new AndroidDeviceManager(this);
    this.ios = new IOSDeviceManager(this);

    server.addListener('error', (err) => {
      this.emit('server-error', err);
    });

    server.addListener('start-client-setup', (client: UninitializedClient) => {
      this.emit('client-setup', client);
    });

    server.addListener(
      'client-setup-error',
      ({client, error}: {client: UninitializedClient; error: Error}) => {
        this.emit('notification', {
          title: `Connection to '${client.appName}' on '${client.deviceName}' failed`,
          description: `Failed to start client connection: ${error}`,
          type: 'error',
        });
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
        this.emit('notification', {
          type: 'error',
          title: `Timed out establishing connection with "${client.appName}" on "${client.deviceName}".`,
          description:
            medium === 'WWW'
              ? `Verify that both your computer and mobile device are on Lighthouse/VPN that you are logged in to Facebook Intern so that certificates can be exhanged. See: https://fburl.com/flippervpn`
              : 'Verify that your client is connected to Flipper and that there is no error related to idb or adb.',
        });
      },
    );
  }

  setServerState(state: FlipperServerState, error?: Error) {
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

  off<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void {
    this.events.off(event, callback);
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

  exec<Event extends keyof FlipperServerCommands>(
    event: Event,
    ...args: Parameters<FlipperServerCommands[Event]>
  ): ReturnType<FlipperServerCommands[Event]> {
    console.debug(`[FlipperServer] command ${event}: `, args);
    const handler: (...args: any[]) => Promise<any> =
      this.commandHandler[event];
    if (!handler) {
      throw new Error(`Unimplemented server command: ${event}`);
    }
    return handler(...args) as any;
  }

  private commandHandler: FlipperServerCommands = {
    'device-start-logging': async (serial: string) =>
      this.getDevice(serial).startLogging(),
    'device-stop-logging': async (serial: string) =>
      this.getDevice(serial).stopLogging(),
    'device-supports-screenshot': async (serial: string) =>
      this.getDevice(serial).screenshotAvailable(),
    'device-supports-screencapture': async (serial: string) =>
      this.getDevice(serial).screenCaptureAvailable(),
    'device-take-screenshot': async (serial: string) =>
      Base64.fromUint8Array(await this.getDevice(serial).screenshot()),
    'device-start-screencapture': async (serial, destination) =>
      this.getDevice(serial).startScreenCapture(destination),
    'device-stop-screencapture': async (serial: string) =>
      this.getDevice(serial).stopScreenCapture(),
    'device-shell-exec': async (serial: string, command: string) =>
      this.getDevice(serial).executeShell(command),
    'device-forward-port': async (serial, local, remote) =>
      this.getDevice(serial).forwardPort(local, remote),
    'device-clear-logs': async (serial) => this.getDevice(serial).clearLogs(),
    'device-navigate': async (serial, loc) =>
      this.getDevice(serial).navigateToLocation(loc),
    'metro-command': async (serial: string, command: string) => {
      const device = this.getDevice(serial);
      if (!(device instanceof MetroDevice)) {
        throw new Error('Not a Metro device: ' + serial);
      }
      device.sendCommand(command);
    },
    'client-request': async (clientId, payload) => {
      this.server.connections.get(clientId)?.connection?.send(payload);
    },
    'client-request-response': async (clientId, payload) => {
      const client = this.server.connections.get(clientId);
      if (client && client.connection) {
        return await client.connection.sendExpectResponse(payload);
      }
      return {
        length: 0,
        error: {
          message: `Client '${clientId} is no longer connected, failed to deliver: ${JSON.stringify(
            payload,
          )}`,
          name: 'CLIENT_DISCONNECTED',
          stacktrace: '',
        },
      };
    },
    'android-get-emulators': async () => this.android.getAndroidEmulators(),
    'android-launch-emulator': async (name, coldBoot) =>
      launchEmulator(name, coldBoot),
    'ios-get-simulators': async (bootedOnly) =>
      this.ios.getSimulators(bootedOnly),
    'ios-launch-simulator': async (udid) => launchSimulator(udid),
  };

  registerDevice(device: ServerDevice) {
    // destroy existing device
    const {serial} = device.info;
    const existing = this.devices.get(serial);
    if (existing) {
      // assert different kind of devices aren't accidentally reusing the same serial
      if (Object.getPrototypeOf(existing) !== Object.getPrototypeOf(device)) {
        throw new Error(
          `Tried to register a new device type for existing serial '${serial}': Trying to replace existing '${
            Object.getPrototypeOf(existing).constructor.name
          }' with a new '${Object.getPrototypeOf(device).constructor.name}`,
        );
      }
      // clean up connection
      existing.disconnect();
    }
    // register new device
    this.devices.set(device.info.serial, device);
    this.emit('device-connected', device.info);
  }

  unregisterDevice(serial: string) {
    const device = this.devices.get(serial);
    if (!device) {
      return;
    }
    device.disconnect(); // we'll only destroy upon replacement
    this.emit('device-disconnected', device.info);
  }

  getDevice(serial: string): ServerDevice {
    const device = this.devices.get(serial);
    if (!device) {
      throw new Error('No device with serial: ' + serial);
    }
    return device;
  }

  getDeviceSerials(): string[] {
    return Array.from(this.devices.keys());
  }

  getDevices(): ServerDevice[] {
    return Array.from(this.devices.values());
  }

  public async close() {
    this.server.close();
    for (const device of this.devices.values()) {
      device.disconnect();
    }
    this.disposers.forEach((f) => f?.());
    this.setServerState('closed');
  }
}
