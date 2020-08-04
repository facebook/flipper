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
import {PluginDetails} from 'flipper-plugin-lib';

import {
  RealFlipperClient,
  SandyPluginInstance,
  FlipperClient,
} from '../plugin/Plugin';
import {
  SandyPluginDefinition,
  FlipperPluginModule,
  FlipperDevicePluginModule,
} from '../plugin/SandyPluginDefinition';
import {SandyPluginRenderer} from '../plugin/PluginRenderer';
import {act} from '@testing-library/react';
import {
  DeviceLogEntry,
  SandyDevicePluginInstance,
  RealFlipperDevice,
  DeviceLogListener,
} from '../plugin/DevicePlugin';

type Renderer = RenderResult<typeof queries>;

interface StartPluginOptions {
  initialState?: Record<string, any>;
  isArchived?: boolean;
  isBackgroundPlugin?: boolean;
}

type ExtractClientType<Module extends FlipperPluginModule<any>> = Parameters<
  Module['plugin']
>[0];

type ExtractMethodsType<
  Module extends FlipperPluginModule<any>
> = ExtractClientType<Module> extends FlipperClient<any, infer Methods>
  ? Methods
  : never;

type ExtractEventsType<
  Module extends FlipperPluginModule<any>
> = ExtractClientType<Module> extends FlipperClient<infer Events, any>
  ? Events
  : never;

interface StartPluginResult<Module extends FlipperPluginModule<any>> {
  /**
   * the instantiated plugin for this test
   */
  instance: ReturnType<Module['plugin']>;
  /**
   * module, from which any other exposed methods can be accessed during testing
   */
  module: Module;
  /**
   * Emulates the 'onActivate' event (when the user opens the plugin in the UI).
   * Will also trigger the `onConnect` event for non-background plugins
   */
  activate(): void;
  /**
   * Emulatese the 'onDeactivate' event
   */
  deactivate(): void;
  /**
   * Emulates the 'onConnect' event
   */
  connect(): void;
  /**
   * Emulatese the 'onDisconnect' event
   */
  disconnect(): void;
  /**
   * Emulates the 'destroy' event. After calling destroy this plugin instance won't be usable anymore
   */
  destroy(): void;
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

  triggerDeepLink(deeplink: unknown): void;

  exportState(): any;
}

interface StartDevicePluginResult<Module extends FlipperDevicePluginModule> {
  /**
   * the instantiated plugin for this test
   */
  instance: ReturnType<Module['devicePlugin']>;
  /**
   * module, from which any other exposed methods can be accessed during testing
   */
  module: Module;
  /**
   * Emulates the 'onActivate' event
   */
  activate(): void;
  /**
   * Emulates the 'onDeactivate' event
   */
  deactivate(): void;
  /**
   * Emulates the 'destroy' event. After calling destroy this plugin instance won't be usable anymore
   */
  destroy(): void;
  /**
   * Emulates sending a log message arriving from the device
   */
  sendLogEntry(logEntry: DeviceLogEntry): void;
  /**
   * Emulates triggering a deeplik
   */
  triggerDeepLink(deeplink: unknown): void;
  /**
   * Grabs the current (exportable) state
   */
  exportState(): any;
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
  const fakeFlipper: RealFlipperClient = {
    isBackgroundPlugin() {
      return !!options?.isBackgroundPlugin;
    },
    initPlugin() {
      pluginInstance.connect();
    },
    deinitPlugin() {
      pluginInstance.disconnect();
    },
    call(
      api: string,
      method: string,
      fromPlugin: boolean,
      params?: Object,
    ): Promise<Object> {
      return sendStub(method, params);
    },
  };

  const pluginInstance = new SandyPluginInstance(
    fakeFlipper,
    definition,
    options?.initialState,
  );
  if (options?.isBackgroundPlugin) {
    pluginInstance.connect(); // otherwise part of activate
  }
  // we start activated
  pluginInstance.activate();

  const res: StartPluginResult<Module> = {
    module,
    instance: pluginInstance.instanceApi,
    activate() {
      pluginInstance.activate();
      pluginInstance.connect();
    },
    deactivate() {
      pluginInstance.deactivate();
      if (!fakeFlipper.isBackgroundPlugin) {
        pluginInstance.disconnect();
      }
    },
    connect: () => pluginInstance.connect(),
    disconnect: () => pluginInstance.disconnect(),
    destroy: () => pluginInstance.destroy(),
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
    exportState: () => pluginInstance.exportState(),
    triggerDeepLink: (deepLink: unknown) => {
      pluginInstance.triggerDeepLink(deepLink);
    },
  };
  // @ts-ignore
  res._backingInstance = pluginInstance;
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
  // @ts-ignore hidden api
  const pluginInstance: SandyPluginInstance = res._backingInstance;

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
    createMockPluginDetails(),
    module,
  );
  if (!definition.isDevicePlugin) {
    throw new Error(
      'Use `startPlugin` or `renderPlugin` to test non-device plugins',
    );
  }

  const testDevice = createMockDevice(options);
  const pluginInstance = new SandyDevicePluginInstance(
    testDevice,
    definition,
    options?.initialState,
  );
  // we start connected
  pluginInstance.activate();

  const res: StartDevicePluginResult<Module> = {
    module,
    instance: pluginInstance.instanceApi,
    activate: () => pluginInstance.activate(),
    deactivate: () => pluginInstance.deactivate(),
    destroy: () => pluginInstance.destroy(),
    sendLogEntry: (entry) => {
      act(() => {
        testDevice.addLogEntry(entry);
      });
    },
    exportState: () => pluginInstance.exportState(),
    triggerDeepLink: (deepLink: unknown) => {
      pluginInstance.triggerDeepLink(deepLink);
    },
  };
  // @ts-ignore
  res._backingInstance = pluginInstance;
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
  const pluginInstance: SandyDevicePluginInstance = res._backingInstance;

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

export function createMockPluginDetails(
  details?: Partial<PluginDetails>,
): PluginDetails {
  return {
    id: 'TestPlugin',
    dir: '',
    name: 'TestPlugin',
    specVersion: 0,
    entry: '',
    isDefault: false,
    main: '',
    source: '',
    title: 'Testing Plugin',
    version: '',
    ...details,
  };
}

function createMockDevice(options?: StartPluginOptions): RealFlipperDevice {
  const logListeners: (undefined | DeviceLogListener)[] = [];
  return {
    isArchived: !!options?.isArchived,
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
  };
}
