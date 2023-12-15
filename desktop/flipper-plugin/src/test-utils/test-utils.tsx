/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import type {RenderResult} from '@testing-library/react';
import {queries} from '@testing-library/dom';
import {
  FlipperServerConfig,
  ReleaseChannel,
  ServerAddOnControls,
  Tristate,
  uuid,
} from 'flipper-common';
import {SandyPluginRenderer} from '../plugin/PluginRenderer';
import {DeviceLogEntry} from 'flipper-common';
import {fsConstants, InstalledPluginDetails} from 'flipper-common';
import {FlipperServer, FlipperServerCommands} from 'flipper-common';
import {
  CrashLogListener,
  Device,
  DeviceLogListener,
  SandyDevicePluginInstance,
} from '../plugin/DevicePlugin';
import {FlipperLib, setFlipperLibImplementation} from '../plugin/FlipperLib';
import {
  PluginClient,
  PluginFactory,
  RealFlipperClient,
  SandyPluginInstance,
} from '../plugin/Plugin';
import {
  FlipperDevicePluginModule,
  FlipperPluginModule,
  SandyPluginDefinition,
} from '../plugin/SandyPluginDefinition';
import {createState} from '../state/atom';
import {stubLogger} from '../utils/Logger';
import {Idler} from '../utils/Idler';
import {BasePluginInstance} from '../plugin/PluginBase';

declare const process: any;

export interface StartPluginOptions {
  initialState?: Record<string, any>;
  isArchived?: boolean;
  isBackgroundPlugin?: boolean;
  startUnactivated?: boolean;
  /** Provide a set of unsupported methods to simulate older clients that don't support certain methods yet */
  unsupportedMethods?: string[];
  /**
   * Provide a set of GKs that are enabled in this test.
   */
  GKs?: string[];
  testDevice?: Device;
}

export function createStubFunction(): jest.Mock<any, any> {
  // we shouldn't be usign jest.fn() outside a unit test, as it would not resolve / cause jest to be bundled up!
  if (typeof jest !== 'undefined') {
    return jest.fn();
  }
  return (() => {
    console.warn('Using a stub function outside a test environment!');
  }) as any;
}

export function createMockFlipperLib(options?: StartPluginOptions): FlipperLib {
  return {
    isFB: false,
    logger: stubLogger,
    enableMenuEntries: createStubFunction(),
    createPaste: createStubFunction(),
    GK(gk: string) {
      return options?.GKs?.includes(gk) || false;
    },
    selectPlugin: createStubFunction(),
    writeTextToClipboard: createStubFunction(),
    openLink: createStubFunction(),
    showNotification: createStubFunction(),
    exportFile: createStubFunction(),
    exportFileBinary: createStubFunction(),
    importFile: createStubFunction(),
    paths: {
      appPath: process.cwd(),
      homePath: `/dev/null`,
      staticPath: process.cwd(),
      tempPath: `/dev/null`,
    },
    environmentInfo: {
      os: {
        arch: 'Test',
        unixname: 'test',
        platform: 'linux',
      },
      env: {},
      isHeadlessBuild: true,
    },
    intern: {
      graphGet: createStubFunction(),
      graphPost: createStubFunction(),
      isLoggedIn: createStubFunction(),
      currentUser: () => createState(null),
      isConnected: () => createState(true),
    },
    remoteServerContext: {
      childProcess: {
        exec: createStubFunction(),
      },
      fs: {
        access: createStubFunction(),
        pathExists: createStubFunction(),
        unlink: createStubFunction(),
        mkdir: createStubFunction(),
        rm: createStubFunction(),
        copyFile: createStubFunction(),
        constants: fsConstants,
        stat: createStubFunction(),
        readlink: createStubFunction(),
        readFile: createStubFunction(),
        readFileBinary: createStubFunction(),
        writeFile: createStubFunction(),
        writeFileBinary: createStubFunction(),
      },
      downloadFile: createStubFunction(),
    },
    settings: createStubFunction(),
  };
}

export function createMockPluginDetails(
  details?: Partial<InstalledPluginDetails>,
): InstalledPluginDetails {
  return {
    id: 'TestPlugin',
    dir: '',
    name: 'TestPlugin',
    specVersion: 0,
    entry: '',
    isActivatable: true,
    main: '',
    source: '',
    title: 'Testing Plugin',
    version: '',
    ...details,
  };
}

export function createTestPlugin<T extends PluginFactory<any, any, any, any>>(
  implementation: Pick<FlipperPluginModule<T>, 'plugin'> &
    Partial<FlipperPluginModule<T>>,
  details?: Partial<InstalledPluginDetails>,
) {
  return new SandyPluginDefinition(
    createMockPluginDetails({
      pluginType: 'client',
      ...details,
    }),
    {
      Component() {
        return null;
      },
      ...implementation,
    },
  );
}

export function createTestDevicePlugin(
  implementation: Pick<FlipperDevicePluginModule, 'devicePlugin'> &
    Partial<FlipperDevicePluginModule>,
  details?: Partial<InstalledPluginDetails>,
) {
  return new SandyPluginDefinition(
    createMockPluginDetails({
      pluginType: 'device',
      ...details,
    }),
    {
      supportsDevice() {
        return true;
      },
      Component() {
        return null;
      },
      ...implementation,
    },
  );
}

export function createFlipperServerMock(
  overrides?: Partial<FlipperServerCommands>,
): FlipperServer {
  return {
    async connect() {},
    on: createStubFunction(),
    off: createStubFunction(),
    exec: jest
      .fn()
      .mockImplementation(
        async (cmd: keyof FlipperServerCommands, ...args: any[]) => {
          if (overrides?.[cmd]) {
            return (overrides[cmd] as any)(...args);
          }
          console.warn(
            `Empty server response stubbed for command '${cmd}', set 'getRenderHostInstance().flipperServer.exec' in your test to override the behavior.`,
          );
          return undefined;
        },
      ),
    close: createStubFunction(),
  };
}
type Renderer = RenderResult<typeof queries>;

type ExtractClientType<Module extends FlipperPluginModule<any>> = Parameters<
  Module['plugin']
>[0];

type ExtractMethodsType<Module extends FlipperPluginModule<any>> =
  ExtractClientType<Module> extends PluginClient<any, infer Methods>
    ? Methods
    : never;

type ExtractEventsType<Module extends FlipperPluginModule<any>> =
  ExtractClientType<Module> extends PluginClient<infer Events, any>
    ? Events
    : never;

interface BasePluginResult {
  /**
   * Mock for Flipper utilities
   */
  flipperLib: FlipperLib;

  /**
   * Emulates the 'onActivate' event
   */
  activate(): void;
  /**
   * Emulates the 'onActivate' event (when the user opens the plugin in the UI).
   * Will also trigger the `onConnect` event for non-background plugins
   */
  deactivate(): void;
  /**
   * Emulates the 'destroy' event. After calling destroy this plugin instance won't be usable anymore
   */
  destroy(): void;

  /**
   * Emulate triggering a deeplink
   */
  triggerDeepLink(deeplink: unknown): Promise<void>;

  /**
   * Grab all the persistable state, but will ignore any onExport handler
   */
  exportState(): Record<string, any>;

  /**
   * Grab all the persistable state, respecting onExport handlers
   */
  exportStateAsync(): Promise<Record<string, any>>;

  /**
   * Trigger menu entry by label
   */
  triggerMenuEntry(label: string): void;
  // TODO: Refine server add-on test methods
  /**
   * Communication with a server add-on
   */
  serverAddOnControls: ServerAddOnControls;
}

interface StartPluginResult<Module extends FlipperPluginModule<any>>
  extends BasePluginResult {
  /**
   * the instantiated plugin for this test
   */
  instance: ReturnType<Module['plugin']>;
  /**
   * module, from which any other exposed methods can be accessed during testing
   */
  module: Module;
  /**
   * Emulates the 'onConnect' event
   */
  connect(): void;
  /**
   * Emulatese the 'onDisconnect' event
   */
  disconnect(): void;
  /**
   * Jest Stub that is called whenever client.send() is called by the plugin.
   * Use send.mockImplementation(function) to intercept the calls.
   */
  onSend: jest.MockedFunction<
    <Method extends keyof ExtractMethodsType<Module>>(
      method: Method,
      params: Parameters<ExtractMethodsType<Module>[Method]>[0],
    ) => ReturnType<ExtractMethodsType<Module>[Method]>
  >;
  /**
   * Send event to the plugin
   */
  sendEvent<Event extends keyof ExtractEventsType<Module>>(
    event: Event,
    params: ExtractEventsType<Module>[Event],
  ): void;
  /**
   * Send events to the plugin
   * The structure used here reflects events that can be recorded
   * with the pluginRecorder
   */
  sendEvents(
    events: {
      method: keyof ExtractEventsType<Module>;
      params: any; // afaik we can't type this :-(
    }[],
  ): void;
}

interface StartDevicePluginResult<Module extends FlipperDevicePluginModule>
  extends BasePluginResult {
  /**
   * the instantiated plugin for this test
   */
  instance: ReturnType<Module['devicePlugin']>;
  /**
   * module, from which any other exposed methods can be accessed during testing
   */
  module: Module;
  /**
   * Emulates sending a log message arriving from the device
   */
  sendLogEntry(logEntry: DeviceLogEntry): void;
}

export function startPlugin<Module extends FlipperPluginModule<any>>(
  module: Module,
  options?: StartPluginOptions,
): StartPluginResult<Module> {
  // eslint-disable-next-line no-eval
  const {act} = eval('require("@testing-library/react")');

  const definition = new SandyPluginDefinition(
    createMockPluginDetails(),
    module,
  );
  if (definition.isDevicePlugin) {
    throw new Error(
      'Use `startDevicePlugin` or `renderDevicePlugin` to test device plugins',
    );
  }

  const sendStub = createStubFunction();
  const flipperUtils = createMockFlipperLib(options);
  const testDevice = createMockDevice(options);
  const appName = 'TestApplication';
  const deviceName = 'TestDevice';
  const fakeFlipperClient: RealFlipperClient = {
    id: `${appName}#${testDevice.os}#${deviceName}#${testDevice.serial}`,
    plugins: new Set([definition.id]),
    query: {
      app: appName,
      device: deviceName,
      device_id: testDevice.serial,
      os: testDevice.serial,
    },
    device: testDevice,
    isBackgroundPlugin(_pluginId: string) {
      return !!options?.isBackgroundPlugin;
    },
    connected: createState(true),
    initPlugin() {
      if (options?.isArchived) {
        return;
      }
      this.connected.set(true);
      pluginInstance.connect();
    },
    deinitPlugin() {
      if (options?.isArchived) {
        return;
      }
      this.connected.set(false);
      pluginInstance.disconnect();
    },
    call(
      _api: string,
      method: string,
      _fromPlugin: boolean,
      params?: Object,
    ): Promise<Object> {
      return sendStub(method, params);
    },
    async supportsMethod(_api: string, method: string) {
      return !options?.unsupportedMethods?.includes(method);
    },
  };

  const serverAddOnControls = createServerAddOnControlsMock();

  setFlipperLibImplementation(flipperUtils);

  const pluginInstance = new SandyPluginInstance(
    serverAddOnControls,
    flipperUtils,
    definition,
    fakeFlipperClient,
    `${fakeFlipperClient.id}#${definition.id}`,
    options?.initialState,
  );

  const res: StartPluginResult<Module> = {
    ...createBasePluginResult(pluginInstance, serverAddOnControls),
    instance: pluginInstance.instanceApi,
    module,
    connect: () => pluginInstance.connect(),
    disconnect: () => pluginInstance.disconnect(),
    onSend: sendStub,
    sendEvent: (event, params) => {
      res.sendEvents([
        {
          method: event,
          params,
        },
      ]);
    },
    sendEvents: (messages) => {
      act(() => {
        pluginInstance.receiveMessages(messages as any);
      });
    },
    serverAddOnControls,
  };
  (res as any)._backingInstance = pluginInstance;
  // we start activated
  if (options?.isBackgroundPlugin) {
    pluginInstance.connect(); // otherwise part of activate
  }
  if (!options?.startUnactivated) {
    pluginInstance.activate();
  }
  return res;
}

export function renderPlugin<Module extends FlipperPluginModule<any>>(
  module: Module,
  options?: StartPluginOptions,
): StartPluginResult<Module> & {
  renderer: Renderer;
  act: (cb: () => void) => void;
} {
  // prevent bundling in UI bundle
  // eslint-disable-next-line no-eval
  const {render, act} = eval('require("@testing-library/react")');
  const res = startPlugin(module, options);
  const pluginInstance: SandyPluginInstance = (res as any)._backingInstance;

  const renderer = render(<SandyPluginRenderer plugin={pluginInstance} />);

  return {
    ...res,
    renderer,
    act,
    destroy: () => {
      renderer.unmount();
      pluginInstance.destroy();
    },
  };
}

export function startDevicePlugin<Module extends FlipperDevicePluginModule>(
  module: Module,
  options?: StartPluginOptions,
): StartDevicePluginResult<Module> {
  // eslint-disable-next-line no-eval
  const {act} = eval('require("@testing-library/react")');

  const definition = new SandyPluginDefinition(
    createMockPluginDetails({pluginType: 'device'}),
    module,
  );
  if (!definition.isDevicePlugin) {
    throw new Error(
      'Use `startPlugin` or `renderPlugin` to test non-device plugins',
    );
  }

  const flipperLib = createMockFlipperLib(options);
  const testDevice = createMockDevice(options);
  const serverAddOnControls = createServerAddOnControlsMock();

  setFlipperLibImplementation(flipperLib);

  const pluginInstance = new SandyDevicePluginInstance(
    serverAddOnControls,
    flipperLib,
    definition,
    testDevice,
    `${testDevice.serial}#${definition.id}`,
    options?.initialState,
  );

  const res: StartDevicePluginResult<Module> = {
    ...createBasePluginResult(pluginInstance, serverAddOnControls),
    module,
    instance: pluginInstance.instanceApi,
    sendLogEntry: (entry) => {
      act(() => {
        testDevice.addLogEntry(entry);
      });
    },
  };
  (res as any)._backingInstance = pluginInstance;
  if (!options?.startUnactivated) {
    // we start connected
    pluginInstance.activate();
  }
  return res;
}

export function renderDevicePlugin<Module extends FlipperDevicePluginModule>(
  module: Module,
  options?: StartPluginOptions,
): StartDevicePluginResult<Module> & {
  renderer: Renderer;
  act: (cb: () => void) => void;
} {
  // eslint-disable-next-line no-eval
  const {render, act} = eval('require("@testing-library/react")');

  const res = startDevicePlugin(module, options);
  // @ts-ignore hidden api
  const pluginInstance: _SandyDevicePluginInstance = (res as any)
    ._backingInstance;

  const renderer = render(<SandyPluginRenderer plugin={pluginInstance} />);

  return {
    ...res,
    renderer,
    act,
    destroy: () => {
      renderer.unmount();
      pluginInstance.destroy();
    },
  };
}

function createBasePluginResult(
  pluginInstance: BasePluginInstance,
  serverAddOnControls: ServerAddOnControls,
): BasePluginResult {
  return {
    flipperLib: pluginInstance.flipperLib,
    activate: () => pluginInstance.activate(),
    deactivate: () => pluginInstance.deactivate(),
    exportStateAsync: () =>
      pluginInstance.exportState(createStubIdler(), () => {}),
    // eslint-disable-next-line node/no-sync
    exportState: () => pluginInstance.exportStateSync(),
    triggerDeepLink: async (deepLink: unknown) => {
      pluginInstance.triggerDeepLink(deepLink);
      return new Promise((resolve) => {
        // this ensures the test won't continue until the setImmediate used by
        // the deeplink handling event is handled
        setTimeout(resolve, 0);
      });
    },
    destroy: () => pluginInstance.destroy(),
    triggerMenuEntry: (action: string) => {
      const entry = pluginInstance.menuEntries.find((e) => e.action === action);
      if (!entry) {
        throw new Error('No menu entry found with action: ' + action);
      }
      entry.handler();
    },
    serverAddOnControls,
  };
}

function createMockDevice(options?: StartPluginOptions): Device & {
  addLogEntry(entry: DeviceLogEntry): void;
} {
  const logListeners: (undefined | DeviceLogListener)[] = [];
  const crashListeners: (undefined | CrashLogListener)[] = [];
  return {
    os: 'Android',
    description: {
      os: 'Android',
      deviceType: 'emulator',
      features: {
        screenCaptureAvailable: false,
        screenshotAvailable: false,
      },
      serial: '123',
      title: 'Test device',
    },
    deviceType: 'emulator',
    serial: 'serial-000',
    ...options?.testDevice,
    isArchived: !!options?.isArchived,
    connected: createState(true),
    addLogListener(cb) {
      logListeners.push(cb);
      return (logListeners.length - 1) as any;
    },
    removeLogListener(idx) {
      logListeners[idx as any] = undefined;
    },
    addCrashListener(cb) {
      crashListeners.push(cb);
      return (crashListeners.length - 1) as any;
    },
    removeCrashListener(idx) {
      crashListeners[idx as any] = undefined;
    },
    addLogEntry(entry: DeviceLogEntry) {
      logListeners.forEach((f) => f?.(entry));
    },
    executeShell: createStubFunction(),
    clearLogs: createStubFunction(),
    forwardPort: createStubFunction(),
    get isConnected() {
      return this.connected.get();
    },
    installApp(_: string) {
      return Promise.resolve();
    },
    navigateToLocation: createStubFunction(),
    screenshot: createStubFunction(),
    sendMetroCommand: createStubFunction(),
  };
}

function createStubIdler(): Idler {
  return {
    shouldIdle() {
      return false;
    },
    idle() {
      return Promise.resolve();
    },
    cancel() {},
    isCancelled() {
      return false;
    },
  };
}

function createServerAddOnControlsMock(): ServerAddOnControls {
  return {
    start: createStubFunction(),
    stop: createStubFunction(),
    sendMessage: createStubFunction(),
    receiveMessage: createStubFunction(),
    receiveAnyMessage: createStubFunction(),
    unsubscribePlugin: createStubFunction(),
    unsubscribe: createStubFunction(),
  };
}

export function createStubFlipperServerConfig(): FlipperServerConfig {
  const rootPath = '/root';
  const stubConfig: FlipperServerConfig = {
    sessionId: uuid(),
    environmentInfo: {
      processId: 4242,
      appVersion: '0.0.0',
      isProduction: true,
      releaseChannel: ReleaseChannel.DEFAULT,
      flipperReleaseRevision: '000',
      os: {
        arch: 'arm64',
        platform: 'darwin',
        unixname: 'iamyourfather',
      },
      versions: {
        node: '16.14.2',
        platform: '22.6.0',
      },
    },
    env: {
      NODE_ENV: 'test',
    },
    gatekeepers: {
      TEST_PASSING_GK: true,
      TEST_FAILING_GK: false,
    },
    launcherSettings: {
      ignoreLocalPin: false,
      releaseChannel: ReleaseChannel.DEFAULT,
    },
    paths: {
      appPath: rootPath,
      desktopPath: `/dev/null`,
      execPath: '/exec',
      homePath: `/dev/null`,
      staticPath: rootPath + '/static',
      tempPath: '/temp',
    },
    processConfig: {
      disabledPlugins: [],
      lastWindowPosition: null,
      launcherEnabled: false,
      launcherMsg: null,
      screenCapturePath: `/dev/null`,
      updaterEnabled: true,
      suppressPluginUpdateNotifications: false,
    },
    settings: {
      androidHome: `/dev/null`,
      darkMode: 'light',
      enableAndroid: false,
      enableIOS: false,
      enablePhysicalIOS: false,
      enablePrefetching: Tristate.False,
      idbPath: `/dev/null`,
      showWelcomeAtStartup: false,
      suppressPluginErrors: false,
      persistDeviceData: false,
      enablePluginMarketplace: false,
      marketplaceURL: '',
      enablePluginMarketplaceAutoUpdate: true,
    },
    validWebSocketOrigins: [],
  };
  return stubConfig;
}
