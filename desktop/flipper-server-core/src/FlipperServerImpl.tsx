/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import './utils/macCa';
import './utils/fetch-polyfill';
import EventEmitter from 'events';
import {ServerController} from './comms/ServerController';
import {CertificateExchangeMedium} from './utils/CertificateProvider';
import {AndroidDeviceManager} from './devices/android/androidDeviceManager';
import {IOSDeviceManager} from './devices/ios/iOSDeviceManager';
import metroDevice from './devices/metro/metroDeviceManager';
import desktopDevice from './devices/desktop/desktopDeviceManager';
import {
  FlipperServerEvents,
  FlipperServerState,
  FlipperServerCommands,
  FlipperServer,
  UninitializedClient,
  FlipperServerConfig,
  Logger,
  FlipperServerExecOptions,
  DeviceDebugData,
} from 'flipper-common';
import {ServerDevice} from './devices/ServerDevice';
import {Base64} from 'js-base64';
import MetroDevice from './devices/metro/MetroDevice';
import {launchEmulator} from './devices/android/AndroidDevice';
import {setFlipperServerConfig} from './FlipperServerConfig';
import {saveSettings} from './utils/settings';
import {saveLauncherSettings} from './utils/launcherSettings';
import {KeytarManager, KeytarModule, SERVICE_FLIPPER} from './utils/keytar';
import {PluginManager} from './plugins/PluginManager';
import {runHealthcheck, getHealthChecks} from './utils/runHealthchecks';
import {openFile} from './utils/openFile';
import {getChangelog} from './utils/pathUtils';
import {sendScribeLogs} from './fb-stubs/sendScribeLogs';
import {
  internGraphGETAPIRequest,
  internGraphPOSTAPIRequest,
} from './fb-stubs/internRequests';
import {commandNodeApiExec} from './commands/NodeApiExec';
import {commandDownloadFileStartFactory} from './commands/DownloadFile';
import {promises} from 'fs';
// Electron 11 runs on Node 12 which does not support fs.promises.rm
import rm from 'rimraf';
import assert from 'assert';
import {initializeAdbClient} from './devices/android/adbClient';
import {assertNotNull} from './comms/Utilities';
import {mkdirp} from 'fs-extra';
import {flipperDataFolder, flipperSettingsFolder} from './utils/paths';
import {DebuggableDevice} from './devices/DebuggableDevice';
import {jfUpload} from './fb-stubs/jf';

const {access, copyFile, mkdir, unlink, stat, readlink, readFile, writeFile} =
  promises;

function isHandledStartupError(e: Error) {
  if (e.message.includes('EADDRINUSE')) {
    return true;
  }

  return false;
}

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
  stateError: string | undefined = undefined;
  android?: AndroidDeviceManager;
  ios?: IOSDeviceManager;
  keytarManager: KeytarManager;
  pluginManager: PluginManager;
  unresponsiveClients: Set<string> = new Set();

  constructor(
    public config: FlipperServerConfig,
    public logger: Logger,
    keytarModule?: KeytarModule,
  ) {
    setFlipperServerConfig(config);
    console.log(
      'Loaded flipper config, paths: ' + JSON.stringify(config.paths, null, 2),
    );
    const server = (this.server = new ServerController(this));
    this.keytarManager = new KeytarManager(keytarModule);
    // given flipper-dump, it might make more sense to have the plugin command
    // handling (like download, install, etc) moved to flipper-server & app,
    // but let's keep things simple for now
    this.pluginManager = new PluginManager(this);

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
        const clientIdentifier = `${client.deviceName}#${client.appName}`;
        if (!this.unresponsiveClients.has(clientIdentifier)) {
          this.unresponsiveClients.add(clientIdentifier);
          this.emit('notification', {
            type: 'error',
            title: `Timed out establishing connection with "${client.appName}" on "${client.deviceName}".`,
            description:
              medium === 'WWW'
                ? `Verify that both your computer and mobile device are on Lighthouse/VPN that you are logged in to Facebook Intern so that certificates can be exhanged. See: https://fburl.com/flippervpn`
                : 'Verify that your client is connected to Flipper and that there is no error related to idb or adb.',
          });
        } else {
          console.warn(
            `[conn] Client still unresponsive: "${client.appName}" on "${client.deviceName}"`,
          );
        }
      },
    );
  }

  setServerState(state: FlipperServerState, error?: Error) {
    this.state = state;
    this.stateError = '' + error;
    this.emit('server-state', {state, error: this.stateError});
  }

  /**
   * Starts listening to parts and watching for devices.
   * Connect never throws directly, but communicates
   * through server-state events
   */
  async connect() {
    if (this.state !== 'pending') {
      throw new Error('Server already started');
    }
    this.setServerState('starting');

    try {
      await this.createFolders();
      await this.server.init();
      await this.pluginManager.start();
      await this.startDeviceListeners();
      this.setServerState('started');
    } catch (e) {
      if (!isHandledStartupError(e)) {
        console.error('Failed to start FlipperServer', e);
      }
      this.setServerState('error', e);
    }
  }

  private async createFolders() {
    await mkdirp(flipperDataFolder);
    await mkdirp(flipperSettingsFolder);
  }

  async startDeviceListeners() {
    const asyncDeviceListenersPromises: Array<Promise<void>> = [];
    if (this.config.settings.enableAndroid) {
      asyncDeviceListenersPromises.push(
        initializeAdbClient(this.config.settings)
          .then((adbClient) => {
            if (!adbClient) {
              return;
            }
            this.android = new AndroidDeviceManager(this, adbClient);
            return this.android.watchAndroidDevices(true);
          })
          .catch((e) => {
            console.error(
              'FlipperServerImpl.startDeviceListeners.watchAndroidDevices -> unexpected error',
              e,
            );
          }),
      );
    }
    if (this.config.settings.enableIOS) {
      this.ios = new IOSDeviceManager(this, this.config.settings);
      asyncDeviceListenersPromises.push(
        this.ios.watchIOSDevices().catch((e) => {
          console.error(
            'FlipperServerImpl.startDeviceListeners.watchIOSDevices -> unexpected error',
            e,
          );
        }),
      );
    }
    const asyncDeviceListeners = await Promise.all(
      asyncDeviceListenersPromises,
    );
    this.disposers.push(
      ...asyncDeviceListeners,
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

  once<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void {
    this.events.once(event, callback);
  }

  off<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void {
    this.events.off(event, callback);
  }

  onAny(callback: (event: keyof FlipperServerEvents, payload: any) => void) {
    this.events.on('*', callback);
  }

  offAny(callback: (event: keyof FlipperServerEvents, payload: any) => void) {
    this.events.off('*', callback);
  }

  /**
   * @internal
   */
  emit<Event extends keyof FlipperServerEvents>(
    event: Event,
    payload: FlipperServerEvents[Event],
  ): void {
    this.events.emit(event, payload);
    this.events.emit('*', event, payload);
  }

  private isExecWithOptions<Event extends keyof FlipperServerCommands>(
    argsAmbiguous:
      | [
          FlipperServerExecOptions,
          Event,
          ...Parameters<FlipperServerCommands[Event]>,
        ]
      | [Event, ...Parameters<FlipperServerCommands[Event]>],
  ): argsAmbiguous is [
    FlipperServerExecOptions,
    Event,
    ...Parameters<FlipperServerCommands[Event]>,
  ] {
    return typeof argsAmbiguous[0] === 'object';
  }

  exec<Event extends keyof FlipperServerCommands>(
    options: FlipperServerExecOptions,
    event: Event,
    ...args: Parameters<FlipperServerCommands[Event]>
  ): ReturnType<FlipperServerCommands[Event]>;
  exec<Event extends keyof FlipperServerCommands>(
    event: Event,
    ...args: Parameters<FlipperServerCommands[Event]>
  ): ReturnType<FlipperServerCommands[Event]>;
  async exec<Event extends keyof FlipperServerCommands>(
    ...argsAmbiguous:
      | [
          FlipperServerExecOptions,
          Event,
          ...Parameters<FlipperServerCommands[Event]>,
        ]
      | [Event, ...Parameters<FlipperServerCommands[Event]>]
  ): Promise<any> {
    let _timeout: number;
    let event: Event;
    let args: Parameters<FlipperServerCommands[Event]>;
    if (this.isExecWithOptions(argsAmbiguous)) {
      _timeout = argsAmbiguous[0].timeout;
      event = argsAmbiguous[1];
      args = argsAmbiguous.slice(2) as typeof args;
    } else {
      // _timeout is currently not used, so we are setting it to a random value. Update it to a meaningful timeout before using it!
      _timeout = 42;
      event = argsAmbiguous[0];
      args = argsAmbiguous.slice(1) as typeof args;
    }

    try {
      const handler: (...args: any[]) => Promise<any> =
        this.commandHandler[event];
      if (!handler) {
        throw new Error(`Unimplemented server command: ${event}`);
      }
      const result = await handler(...args);
      console.debug(`[FlipperServer] command '${event}' - OK`);
      return result;
    } catch (e) {
      console.debug(`[FlipperServer] command '${event}' - ERROR: ${e} `);
      throw e;
    }
  }

  private commandHandler: FlipperServerCommands = {
    'device-install-app': async (serial, bundlePath) => {
      return this.devices.get(serial)?.installApp(bundlePath);
    },
    'get-server-state': async () => ({
      state: this.state,
      error: this.stateError,
    }),
    'node-api-exec': commandNodeApiExec,
    'node-api-fs-access': access,
    'node-api-fs-pathExists': async (path, mode) => {
      try {
        await access(path, mode);
        return true;
      } catch {
        return false;
      }
    },
    'node-api-fs-unlink': unlink,
    'node-api-fs-mkdir': mkdir,
    'node-api-fs-rm': async (path, {maxRetries} = {}) =>
      new Promise<void>((resolve, reject) =>
        rm(path, {disableGlob: true, maxBusyTries: maxRetries}, (err) =>
          err ? reject(err) : resolve(),
        ),
      ),
    'node-api-fs-copyFile': copyFile,
    'node-api-fs-stat': async (path) => {
      const stats = await stat(path);
      const {atimeMs, birthtimeMs, ctimeMs, gid, mode, mtimeMs, size, uid} =
        stats;
      return {
        atimeMs,
        birthtimeMs,
        ctimeMs,
        gid,
        mode,
        mtimeMs,
        size,
        uid,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink(),
      };
    },
    'node-api-fs-readlink': readlink,
    'node-api-fs-readfile': async (path, options) => {
      const contents = await readFile(path, options ?? 'utf8');
      assert(
        typeof contents === 'string',
        `File ${path} was not read with a string encoding`,
      );
      return contents;
    },
    'node-api-fs-readfile-binary': async (path) => {
      const contents = await readFile(path);
      return Base64.fromUint8Array(contents);
    },
    'node-api-fs-writefile': (path, contents, options) =>
      writeFile(path, contents, options ?? 'utf8'),
    'node-api-fs-writefile-binary': (path, base64contents) =>
      writeFile(path, Base64.toUint8Array(base64contents), 'binary'),
    // TODO: Do we need API to cancel an active download?
    'download-file-start': commandDownloadFileStartFactory(
      this.emit.bind(this),
    ),
    'get-config': async () => this.config,
    'get-changelog': getChangelog,
    'device-find': async (deviceSerial) => {
      return this.devices.get(deviceSerial)?.info;
    },
    'device-list': async () => {
      return Array.from(this.devices.values()).map((d) => d.info);
    },
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
    'fetch-debug-data': () => this.fetchDebugLogs(),
    'metro-command': async (serial: string, command: string) => {
      const device = this.getDevice(serial);
      if (!(device instanceof MetroDevice)) {
        throw new Error('Not a Metro device: ' + serial);
      }
      device.sendCommand(command);
    },
    'client-find': async (clientId) => {
      return this.server.connections.get(clientId)?.client;
    },
    'client-list': async () => {
      return Array.from(this.server.connections.values()).map((c) => c.client);
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
    'android-get-emulators': async () => {
      assertNotNull(this.android);
      return this.android.getAndroidEmulators();
    },
    'android-launch-emulator': async (name, coldBoot) =>
      launchEmulator(this.config.settings.androidHome, name, coldBoot),
    'ios-get-simulators': async (bootedOnly) => {
      assertNotNull(this.ios);
      return this.ios.getSimulators(bootedOnly);
    },
    'ios-launch-simulator': async (udid) => {
      assertNotNull(this.ios);
      return this.ios.simctlBridge.launchSimulator(udid);
    },
    'persist-settings': async (settings) => saveSettings(settings),
    'persist-launcher-settings': async (settings) =>
      saveLauncherSettings(settings),
    'keychain-read': (service) => this.keytarManager.retrieveToken(service),
    'keychain-write': (service, password) =>
      this.keytarManager.writeKeychain(service, password),
    'keychain-unset': (service) => this.keytarManager.unsetKeychain(service),
    'plugins-load-dynamic-plugins': () =>
      this.pluginManager.loadDynamicPlugins(),
    'plugins-load-marketplace-plugins': () =>
      this.pluginManager.loadMarketplacePlugins(),
    'plugins-get-installed-plugins': () =>
      this.pluginManager.getInstalledPlugins(),
    'plugins-remove-plugins': (plugins) =>
      this.pluginManager.removePlugins(plugins),
    'plugin-start-download': (details) =>
      this.pluginManager.downloadPlugin(details),
    'plugins-get-updatable-plugins': (query) =>
      this.pluginManager.getUpdatablePlugins(query),
    'plugins-install-from-file': (path) =>
      this.pluginManager.installPluginFromFile(path),
    'plugins-install-from-marketplace': (name: string) =>
      this.pluginManager.installPluginForMarketplace(name),
    'plugins-install-from-npm': (name) =>
      this.pluginManager.installPluginFromNpm(name),
    'plugin-source': (path) => this.pluginManager.loadSource(path),
    'plugins-server-add-on-start': (pluginName, details, owner) =>
      this.pluginManager.startServerAddOn(pluginName, details, owner),
    'plugins-server-add-on-stop': (pluginName, owner) =>
      this.pluginManager.stopServerAddOn(pluginName, owner),
    'plugins-server-add-on-request-response': async (payload) => {
      try {
        const serverAddOn =
          this.pluginManager.getServerAddOnForMessage(payload);
        assertNotNull(serverAddOn);
        return await serverAddOn.sendExpectResponse(payload);
      } catch {
        return {
          length: 0,
          error: {
            message: `Server add-on for message '${JSON.stringify(
              payload,
            )} is no longer running.`,
            name: 'SERVER_ADDON_STOPPED',
            stacktrace: '',
          },
        };
      }
    },
    'doctor-get-healthchecks': getHealthChecks,
    'doctor-run-healthcheck': runHealthcheck,
    'open-file': openFile,
    'intern-graph-post': async (endpoint, formfields, filefields, options) => {
      const token = await this.keytarManager.retrieveToken(SERVICE_FLIPPER);
      return internGraphPOSTAPIRequest(
        endpoint,
        formfields,
        filefields,
        options,
        token,
      );
    },
    'intern-graph-get': async (endpoint, params, options) => {
      const token = await this.keytarManager.retrieveToken(SERVICE_FLIPPER);
      return internGraphGETAPIRequest(endpoint, params, options, token);
    },
    'intern-upload-scribe-logs': sendScribeLogs,
    'intern-cloud-upload': async (path) => {
      const uploadRes = await jfUpload(path);
      if (!uploadRes) {
        throw new Error('Upload failed');
      }
      return uploadRes;
    },
    shutdown: async () => {
      process.exit(0);
    },
    'is-logged-in': async () => {
      try {
        const token = await this.keytarManager.retrieveToken(SERVICE_FLIPPER);
        return !!token;
      } catch (e) {
        return false;
      }
    },
    'environment-info': async () => {
      return this.config.environmentInfo;
    },
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
    this.devices.delete(serial);
    device.disconnect(); // we'll only destroy upon replacement
    this.emit('device-disconnected', device.info);
  }

  getDevice(serial: string): ServerDevice {
    const device = this.devices.get(serial);
    if (!device) {
      console.warn(`No device with serial ${serial}.`);
      throw new Error('No device with matching serial.');
    }
    return device;
  }

  hasDevice(serial: string): boolean {
    return !!this.devices.get(serial);
  }

  getDeviceSerials(): string[] {
    return Array.from(this.devices.keys());
  }

  getDevices(): ServerDevice[] {
    return Array.from(this.devices.values());
  }

  private async fetchDebugLogs() {
    const debugDataForEachDevice = await Promise.all(
      [...this.devices.values()]
        .filter(
          (device) =>
            device.connected &&
            (device.info.os === 'Android' || device.info.os === 'iOS'),
        )
        .map((device) =>
          (device as unknown as DebuggableDevice)
            .readFlipperFolderForAllApps()

            .catch((e) => {
              console.warn(
                'fetchDebugLogs -> could not fetch debug data',
                device.info.serial,
                e,
              );
            }),
        ),
    );
    return debugDataForEachDevice
      .filter((item): item is DeviceDebugData[] => !!item)
      .flat();
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
