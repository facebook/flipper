/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {
  render,
  RenderResult,
  act as testingLibAct,
} from '@testing-library/react';
import {queries} from '@testing-library/dom';
import {
  BundledPluginDetails,
  fsConstants,
  InstalledPluginDetails,
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
import {act} from '@testing-library/react';
import {
  SandyDevicePluginInstance,
  Device,
  DeviceLogListener,
} from '../plugin/DevicePlugin';
import {BasePluginInstance} from '../plugin/PluginBase';
import {FlipperLib} from '../plugin/FlipperLib';
import {stubLogger} from '../utils/Logger';
import {Idler} from '../utils/Idler';
import {createState} from '../state/atom';
import baseMockConsole from 'jest-mock-console';
import {
  DeviceLogEntry,
  FlipperServer,
  FlipperServerCommands,
} from 'flipper-common';

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
  const definition = new SandyPluginDefinition(
    createMockPluginDetails(),
    module,
  );
  if (definition.isDevicePlugin) {
    throw new Error(
      'Use `startDevicePlugin` or `renderDevicePlugin` to test device plugins',
    );
  }

  const sendStub = jest.fn();
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

  const pluginInstance = new SandyPluginInstance(
    flipperUtils,
    definition,
    fakeFlipperClient,
    `${fakeFlipperClient.id}#${definition.id}`,
    options?.initialState,
  );

  const res: StartPluginResult<Module> = {
    ...createBasePluginResult(pluginInstance),
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
  const res = startPlugin(module, options);
  const pluginInstance: SandyPluginInstance = (res as any)._backingInstance;

  const renderer = render(<SandyPluginRenderer plugin={pluginInstance} />);

  return {
    ...res,
    renderer,
    act: testingLibAct,
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
  const pluginInstance = new SandyDevicePluginInstance(
    flipperLib,
    definition,
    testDevice,
    `${testDevice.serial}#${definition.id}`,
    options?.initialState,
  );

  const res: StartDevicePluginResult<Module> = {
    ...createBasePluginResult(pluginInstance),
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
  const res = startDevicePlugin(module, options);
  // @ts-ignore hidden api
  const pluginInstance: SandyDevicePluginInstance = (res as any)
    ._backingInstance;

  const renderer = render(<SandyPluginRenderer plugin={pluginInstance} />);

  return {
    ...res,
    renderer,
    act: testingLibAct,
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
    enableMenuEntries: jest.fn(),
    createPaste: jest.fn(),
    GK(gk: string) {
      return options?.GKs?.includes(gk) || false;
    },
    selectPlugin: jest.fn(),
    writeTextToClipboard: jest.fn(),
    openLink: jest.fn(),
    showNotification: jest.fn(),
    exportFile: jest.fn(),
    importFile: jest.fn(),
    paths: {
      appPath: process.cwd(),
      homePath: `/dev/null`,
      tempPath: `/dev/null`,
    },
    environmentInfo: {
      os: {
        arch: 'Test',
        unixname: 'test',
        platform: 'linux',
      },
    },
    remoteServerContext: {
      childProcess: {
        exec: jest.fn(),
      },
      fs: {
        access: jest.fn(),
        pathExists: jest.fn(),
        unlink: jest.fn(),
        mkdir: jest.fn(),
        rm: jest.fn(),
        copyFile: jest.fn(),
        constants: fsConstants,
      },
      downloadFile: jest.fn(),
    },
  };
}

function createBasePluginResult(
  pluginInstance: BasePluginInstance,
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
        setImmediate(resolve);
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

export function createTestPlugin<T extends PluginFactory<any, any>>(
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
  return {
    os: 'Android',
    deviceType: 'emulator',
    serial: 'serial-000',
    isArchived: !!options?.isArchived,
    connected: createState(true),
    addLogListener(cb) {
      logListeners.push(cb);
      return (logListeners.length - 1) as any;
    },
    removeLogListener(idx) {
      logListeners[idx as any] = undefined;
    },
    addLogEntry(entry: DeviceLogEntry) {
      logListeners.forEach((f) => f?.(entry));
    },
    executeShell: jest.fn(),
    clearLogs: jest.fn(),
    forwardPort: jest.fn(),
    get isConnected() {
      return this.connected.get();
    },
    navigateToLocation: jest.fn(),
    screenshot: jest.fn(),
    sendMetroCommand: jest.fn(),
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

/**
 * Mockes the current console. Inspect results through e.g.
 * console.errorCalls etc.
 *
 * Or, alternatively, expect(mockedConsole.error).toBeCalledWith...
 *
 * Don't forgot to call .unmock when done!
 */
export function mockConsole() {
  const restoreConsole = baseMockConsole();
  // The mocked console methods, make sure they remain available after unmocking
  const {log, error, warn} = console as any;
  return {
    get logCalls(): any[][] {
      return log.mock.calls;
    },
    get errorCalls(): any[][] {
      return error.mock.calls;
    },
    get warnCalls(): any[][] {
      return warn.mock.calls;
    },
    get log(): jest.Mock<any, any> {
      return log as any;
    },
    get warn(): jest.Mock<any, any> {
      return warn as any;
    },
    get error(): jest.Mock<any, any> {
      return error as any;
    },
    unmock() {
      restoreConsole();
    },
  };
}

export type MockedConsole = ReturnType<typeof mockConsole>;

export function createFlipperServerMock(
  overrides?: Partial<FlipperServerCommands>,
): FlipperServer {
  return {
    async connect() {},
    on: jest.fn(),
    off: jest.fn(),
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
    close: jest.fn(),
  };
}
