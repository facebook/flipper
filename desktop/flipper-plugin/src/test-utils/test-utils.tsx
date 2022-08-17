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
  BundledPluginDetails,
  fsConstants,
  InstalledPluginDetails,
  ServerAddOnControls,
} from 'flipper-common';

import {
  RealFlipperClient,
  SandyPluginInstance,
  PluginClient,
  PluginFactory,
} from '../plugin/Plugin';
import {
  SandyPluginDefinition,
  FlipperPluginModule,
  FlipperDevicePluginModule,
} from '../plugin/SandyPluginDefinition';
import {SandyPluginRenderer} from '../plugin/PluginRenderer';
import {
  SandyDevicePluginInstance,
  Device,
  DeviceLogListener,
  CrashLogListener,
} from '../plugin/DevicePlugin';
import {BasePluginInstance} from '../plugin/PluginBase';
import {FlipperLib} from '../plugin/FlipperLib';
import {stubLogger} from '../utils/Logger';
import {Idler} from '../utils/Idler';
import {createState} from '../state/atom';
import {
  DeviceLogEntry,
  FlipperServer,
  FlipperServerCommands,
} from 'flipper-common';

declare const process: any;
declare const electronRequire: any;

type Renderer = RenderResult<typeof queries>;

interface StartPluginOptions {
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

export function createStubFunction(): jest.Mock<any, any> {
  // we shouldn't be usign jest.fn() outside a unit test, as it would not resolve / cause jest to be bundled up!
  if (typeof jest !== 'undefined') {
    return jest.fn();
  }
  return (() => {
    console.warn('Using a stub function outside a test environment!');
  }) as any;
}

export function startPlugin<Module extends FlipperPluginModule<any>>(
  module: Module,
  options?: StartPluginOptions,
): StartPluginResult<Module> {
  const {act} = electronRequire('@testing-library/react');

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
  const {render, act} = electronRequire('@testing-library/react');
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
  const {act} = electronRequire('@testing-library/react');

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
  const {render, act} = electronRequire('@testing-library/react');

  const res = startDevicePlugin(module, options);
  // @ts-ignore hidden api
  const pluginInstance: SandyDevicePluginInstance = (res as any)
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
    },
    intern: {
      graphGet: createStubFunction(),
      graphPost: createStubFunction(),
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

export function createMockPluginDetails(
  details?: Partial<InstalledPluginDetails>,
): InstalledPluginDetails {
  return {
    id: 'TestPlugin',
    dir: '',
    name: 'TestPlugin',
    specVersion: 0,
    entry: '',
    isBundled: false,
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

export function createMockBundledPluginDetails(
  details?: Partial<BundledPluginDetails>,
): BundledPluginDetails {
  return {
    id: 'TestBundledPlugin',
    name: 'TestBundledPlugin',
    specVersion: 0,
    pluginType: 'client',
    isBundled: true,
    isActivatable: true,
    main: '',
    source: '',
    title: 'Testing Bundled Plugin',
    version: '',
    ...details,
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
