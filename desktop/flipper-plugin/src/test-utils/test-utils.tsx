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
import {ServerAddOnControls} from 'flipper-common';

import {
  _RealFlipperClient,
  _SandyPluginInstance,
  PluginClient,
  _PluginFactory,
  _SandyPluginDefinition,
  _FlipperPluginModule,
  _FlipperDevicePluginModule,
  _SandyDevicePluginInstance,
  Device,
  DeviceLogListener,
  CrashLogListener,
  _BasePluginInstance,
  FlipperLib,
  _stubLogger,
  Idler,
  createState,
  TestUtils,
  _StartPluginOptions,
  _setFlipperLibImplementation,
} from 'flipper-plugin-core';
import {SandyPluginRenderer} from '../plugin/PluginRenderer';
import {DeviceLogEntry} from 'flipper-common';

declare const electronRequire: any;

type Renderer = RenderResult<typeof queries>;

type ExtractClientType<Module extends _FlipperPluginModule<any>> = Parameters<
  Module['plugin']
>[0];

type ExtractMethodsType<Module extends _FlipperPluginModule<any>> =
  ExtractClientType<Module> extends PluginClient<any, infer Methods>
    ? Methods
    : never;

type ExtractEventsType<Module extends _FlipperPluginModule<any>> =
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

interface StartPluginResult<Module extends _FlipperPluginModule<any>>
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

interface StartDevicePluginResult<Module extends _FlipperDevicePluginModule>
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

export function startPlugin<Module extends _FlipperPluginModule<any>>(
  module: Module,
  options?: _StartPluginOptions,
): StartPluginResult<Module> {
  const {act} = electronRequire('@testing-library/react');

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    module,
  );
  if (definition.isDevicePlugin) {
    throw new Error(
      'Use `startDevicePlugin` or `renderDevicePlugin` to test device plugins',
    );
  }

  const sendStub = TestUtils.createStubFunction();
  const flipperUtils = TestUtils.createMockFlipperLib(options);
  const testDevice = createMockDevice(options);
  const appName = 'TestApplication';
  const deviceName = 'TestDevice';
  const fakeFlipperClient: _RealFlipperClient = {
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

  _setFlipperLibImplementation(flipperUtils);

  const pluginInstance = new _SandyPluginInstance(
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

export function renderPlugin<Module extends _FlipperPluginModule<any>>(
  module: Module,
  options?: _StartPluginOptions,
): StartPluginResult<Module> & {
  renderer: Renderer;
  act: (cb: () => void) => void;
} {
  // prevent bundling in UI bundle
  const {render, act} = electronRequire('@testing-library/react');
  const res = startPlugin(module, options);
  const pluginInstance: _SandyPluginInstance = (res as any)._backingInstance;

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

export function startDevicePlugin<Module extends _FlipperDevicePluginModule>(
  module: Module,
  options?: _StartPluginOptions,
): StartDevicePluginResult<Module> {
  const {act} = electronRequire('@testing-library/react');

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails({pluginType: 'device'}),
    module,
  );
  if (!definition.isDevicePlugin) {
    throw new Error(
      'Use `startPlugin` or `renderPlugin` to test non-device plugins',
    );
  }

  const flipperLib = TestUtils.createMockFlipperLib(options);
  const testDevice = createMockDevice(options);
  const serverAddOnControls = createServerAddOnControlsMock();

  _setFlipperLibImplementation(flipperLib);

  const pluginInstance = new _SandyDevicePluginInstance(
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

export function renderDevicePlugin<Module extends _FlipperDevicePluginModule>(
  module: Module,
  options?: _StartPluginOptions,
): StartDevicePluginResult<Module> & {
  renderer: Renderer;
  act: (cb: () => void) => void;
} {
  const {render, act} = electronRequire('@testing-library/react');

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
  pluginInstance: _BasePluginInstance,
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

function createMockDevice(options?: _StartPluginOptions): Device & {
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
    executeShell: TestUtils.createStubFunction(),
    clearLogs: TestUtils.createStubFunction(),
    forwardPort: TestUtils.createStubFunction(),
    get isConnected() {
      return this.connected.get();
    },
    installApp(_: string) {
      return Promise.resolve();
    },
    navigateToLocation: TestUtils.createStubFunction(),
    screenshot: TestUtils.createStubFunction(),
    sendMetroCommand: TestUtils.createStubFunction(),
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
    start: TestUtils.createStubFunction(),
    stop: TestUtils.createStubFunction(),
    sendMessage: TestUtils.createStubFunction(),
    receiveMessage: TestUtils.createStubFunction(),
    receiveAnyMessage: TestUtils.createStubFunction(),
    unsubscribePlugin: TestUtils.createStubFunction(),
    unsubscribe: TestUtils.createStubFunction(),
  };
}

export const createMockFlipperLib = TestUtils.createMockFlipperLib;
export const createMockPluginDetails = TestUtils.createMockPluginDetails;
export const createTestPlugin = TestUtils.createTestPlugin;
export const createTestDevicePlugin = TestUtils.createTestDevicePlugin;
export const createFlipperServerMock = TestUtils.createFlipperServerMock;
