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
import {PluginDetails} from 'flipper-plugin-lib';

import {RealFlipperClient, SandyPluginInstance} from '../plugin/Plugin';
import {
  SandyPluginDefinition,
  FlipperPluginModule,
} from '../plugin/SandyPluginDefinition';
import {SandyPluginRenderer} from '../plugin/PluginRenderer';

type Renderer = RenderResult<typeof import('testing-library__dom/queries')>;

interface StartPluginOptions {
  // TODO: support initial events T68683442 (and type correctly)
  // TODO: support initial state T68683449 (and type correctly)
}

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
}

export function startPlugin<Module extends FlipperPluginModule<any>>(
  module: Module,
  _options?: StartPluginOptions,
): StartPluginResult<Module> {
  const definition = new SandyPluginDefinition(
    createMockPluginDetails(),
    module,
  );

  const fakeFlipper: RealFlipperClient = {
    isBackgroundPlugin(_pluginId: string) {
      // we only reason about non-background plugins,
      // as from testing perspective the difference shouldn't matter
      return false;
    },
    initPlugin(_pluginId: string) {},
    deinitPlugin(_pluginId: string) {},
  };

  const pluginInstance = new SandyPluginInstance(fakeFlipper, definition);
  // we start connected
  pluginInstance.connect();

  return {
    module,
    instance: pluginInstance.instanceApi,
    connect: () => pluginInstance.connect(),
    disconnect: () => pluginInstance.disconnect(),
    destroy: () => pluginInstance.destroy(),
    // @ts-ignore
    _backingInstance: pluginInstance,
  };
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
